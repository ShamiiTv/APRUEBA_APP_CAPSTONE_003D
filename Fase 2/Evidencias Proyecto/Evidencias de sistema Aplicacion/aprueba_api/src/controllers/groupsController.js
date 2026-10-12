import { db } from '../config/firebase.js';
import { summarizeProgress } from '../services/progress.js';
import { TEST_IDS, problem, fail, ok, fields, identifier, requestId, text, groupLimit, stableId, dateISO, checkOperation } from '../services/social.js';

function view(doc, uid) {
  const g = doc.data();
  return { id: doc.id, name: g.name, subjectTestId: g.subjectTestId, ownerId: g.ownerId, memberCount: g.memberIds?.length || 0, role: g.ownerId === uid ? 'owner' : 'member', createdAt: dateISO(g.createdAt), lastActivityAt: dateISO(g.lastActivityAt) };
}
export async function getMyGroups(req, res) {
  try {
    const uid = req.user.sub;
    const [user, groups] = await Promise.all([db.collection('users').doc(uid).get(), db.collection('groups').where('memberIds', 'array-contains', uid).get()]);
    if (!user.exists) throw problem('Usuario no encontrado', 404);
    return ok(res, groups.docs.map(doc => view(doc, uid)).sort((a,b) => (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '')), { groupLimit: groupLimit(user.data()) });
  } catch (error) { return fail(res, error); }
}
export async function createGroup(req, res) {
  try {
    fields(req.body, ['name', 'subjectTestId', 'requestId']);
    const input = { name: text(req.body.name, 100), subjectTestId: req.body.subjectTestId || 'm1' };
    if (!TEST_IDS.includes(input.subjectTestId)) throw problem('Materia inválida');
    const uid = req.user.sub, id = requestId(req.body);
    const userRef = db.collection('users').doc(uid);
    const opRef = userRef.collection('socialOperations').doc(id);
    const groupRef = db.collection('groups').doc(stableId(uid, id));
    const signature = JSON.stringify(['create-group', input]);
    const result = await db.runTransaction(async tx => {
      const [user, previous, memberships] = await Promise.all([tx.get(userRef), tx.get(opRef), tx.get(db.collection('groups').where('memberIds', 'array-contains', uid))]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      if (checkOperation(previous, signature)) return { id: previous.data().groupId, replayed: true };
      const limit = groupLimit(user.data());
      if (limit && memberships.size >= limit) throw problem('Alcanzaste el límite de grupos de tu plan. Puedes salir de un grupo antes de crear otro.', 409);
      const now = new Date();
      tx.set(groupRef, { ...input, ownerId: uid, memberIds: [uid], memberCount: 1, createdAt: now, lastActivityAt: now, updatedAt: now });
      tx.set(groupRef.collection('members').doc(uid), { name: user.data().name || 'Estudiante', role: 'owner', joinedAt: now });
      tx.update(userRef, { groupsUpdatedAt: now });
      tx.set(opRef, { signature, groupId: groupRef.id, createdAt: now });
      return { id: groupRef.id, replayed: false };
    });
    return ok(res, result, null, result.replayed ? 200 : 201);
  } catch (error) { return fail(res, error); }
}
export async function joinGroup(req, res) {
  try {
    fields(req.body, ['groupId']);
    const uid = req.user.sub, id = identifier(req.body.groupId);
    const userRef = db.collection('users').doc(uid), groupRef = db.collection('groups').doc(id);
    const result = await db.runTransaction(async tx => {
      const [user, group, memberships] = await Promise.all([tx.get(userRef), tx.get(groupRef), tx.get(db.collection('groups').where('memberIds', 'array-contains', uid))]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      if (!group.exists || group.data().archived) throw problem('El grupo no existe o está cerrado', 404);
      const members = group.data().memberIds || [];
      if (members.includes(uid)) return { id, alreadyMember: true };
      if (members.length >= 100) throw problem('El grupo alcanzó su capacidad de 100 miembros', 409);
      const limit = groupLimit(user.data());
      if (limit && memberships.size >= limit) throw problem('Alcanzaste el límite de grupos de tu plan', 409);
      const now = new Date();
      tx.update(groupRef, { memberIds: [...members, uid], memberCount: members.length + 1, lastActivityAt: now, updatedAt: now });
      tx.set(groupRef.collection('members').doc(uid), { name: user.data().name || 'Estudiante', role: 'member', joinedAt: now });
      tx.update(userRef, { groupsUpdatedAt: now });
      return { id, alreadyMember: false };
    });
    return ok(res, result);
  } catch (error) { return fail(res, error); }
}
export async function leaveGroup(req, res) {
  try {
    fields(req.body || {}, []);
    const uid = req.user.sub, id = identifier(req.params.id);
    const ref = db.collection('groups').doc(id), userRef = db.collection('users').doc(uid);
    await db.runTransaction(async tx => {
      const [group, user] = await Promise.all([tx.get(ref), tx.get(userRef)]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      if (!group.exists || !group.data().memberIds?.includes(uid)) return;
      const data = group.data(), members = data.memberIds.filter(member => member !== uid);
      const nextOwner = data.ownerId === uid ? members[0] || null : data.ownerId;
      const now = new Date();
      tx.update(ref, { memberIds: members, memberCount: members.length, ownerId: nextOwner, archived: !members.length, updatedAt: now, lastActivityAt: now });
      tx.delete(ref.collection('members').doc(uid));
      if (nextOwner && nextOwner !== data.ownerId) tx.set(ref.collection('members').doc(nextOwner), { role: 'owner' }, { merge: true });
      tx.update(userRef, { groupsUpdatedAt: now });
    });
    return ok(res, { id, left: true });
  } catch (error) { return fail(res, error); }
}
export async function getGroup(req, res) {
  try {
    const uid = req.user.sub, id = identifier(req.params.id);
    const ref = db.collection('groups').doc(id), group = await ref.get();
    if (!group.exists) throw problem('Grupo no encontrado', 404);
    const data = group.data();
    if (!data.memberIds?.includes(uid)) throw problem('Solo los miembros pueden ver este grupo', 403);
    const questions = await db.collection('questions').select('testId','statement','options','correctAnswer','status','bankVersion','pedagogicalUse','contentId').get();
    const bank = questions.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const members = await Promise.all(data.memberIds.map(async memberId => {
      const [user, history] = await Promise.all([db.collection('users').doc(memberId).get(), db.collection('users').doc(memberId).collection('answeredQuestions').where('testId', '==', data.subjectTestId).get()]);
      const progress = summarizeProgress({}, history.docs.map(doc => ({ ...doc.data(), id: doc.id })), bank);
      const result = progress.subjects.find(subject => subject.testId === data.subjectTestId);
      return { uid: memberId, name: user.data()?.name || 'Estudiante', role: data.ownerId === memberId ? 'owner' : 'member', answered: result?.answered || 0, correct: result?.correct || 0, accuracy: result?.accuracy ?? null };
    }));
    // Membership can change while summaries load; recheck before returning private data.
    const latest = await ref.get();
    if (!latest.exists || !latest.data().memberIds?.includes(uid)) throw problem('Ya no perteneces a este grupo', 403);
    const currentMembers = members.filter(member => latest.data().memberIds.includes(member.uid)).map(member => ({ ...member, role: latest.data().ownerId === member.uid ? 'owner' : 'member' }));
    const answered = currentMembers.reduce((sum, member) => sum + member.answered, 0);
    const correct = currentMembers.reduce((sum, member) => sum + member.correct, 0);
    return ok(res, { ...view(latest, uid), members: currentMembers, statistics: { answered, correct, accuracy: answered ? Math.round(100 * correct / answered) : null, myAccuracy: currentMembers.find(member => member.uid === uid)?.accuracy ?? null } });
  } catch (error) { return fail(res, error); }
}
