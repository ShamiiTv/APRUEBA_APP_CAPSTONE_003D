import { db } from '../config/firebase.js';

// Listar grupos a los que pertenece el usuario autenticado
export async function getMyGroups(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) return res.fail('Usuario no autenticado', null, 401);

    const snapshot = await db.collection('groups')
      .where('memberIds', 'array-contains', uid)
      .orderBy('lastActivityAt', 'desc')
      .get();

    const groups = [];
    for (const doc of snapshot.docs) {
      const gData = doc.data();
      // Leer miembros de la subcolección
      const membersSnap = await doc.ref.collection('members').get();
      const members = [];
      membersSnap.forEach((mDoc) => members.push({ uid: mDoc.id, ...mDoc.data() }));

      groups.push({
        id: doc.id,
        ...gData,
        members
      });
    }

    return res.success(groups);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Crear un nuevo grupo de estudio con el esquema oficial de Firestore
export async function createGroup(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { name, subjectTestId = 'm1', color = '#1A365D' } = req.body;

    if (!name || name.trim() === '') {
      return res.fail('El nombre del grupo es obligatorio', null, 400);
    }

    // Obtener datos del usuario creador
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    const userData = userDoc.data();

    const newGroupRef = db.collection('groups').doc();
    const groupId = newGroupRef.id;
    const now = new Date();

    const groupPayload = {
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      subjectTestId,
      ownerId: uid,
      color,
      memberIds: [uid],
      memberCount: 1,
      avgScore: 0,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now
    };

    await newGroupRef.set(groupPayload);

    // Agregar creador a la subcolección groups/{groupId}/members
    await newGroupRef.collection('members').doc(uid).set({
      name: userData.name || 'Estudiante',
      avatarColor: userData.avatarColor || '#1A365D',
      role: 'owner',
      score: 0,
      joinedAt: now
    });

    return res.success({ id: groupId, ...groupPayload }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Unirse a un grupo existente mediante su código/ID
export async function joinGroup(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { groupId } = req.body;

    if (!groupId) return res.fail('El código del grupo es obligatorio', null, 400);

    const groupRef = db.collection('groups').doc(groupId);
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    const userData = userDoc.data();

    await db.runTransaction(async (transaction) => {
      const gDoc = await transaction.get(groupRef);
      if (!gDoc.exists) throw new Error('El grupo no existe');

      const gData = gDoc.data();
      if (gData.memberIds?.includes(uid)) {
        throw new Error('Ya eres miembro de este grupo');
      }

      const updatedMembers = [...(gData.memberIds || []), uid];
      const now = new Date();

      transaction.update(groupRef, {
        memberIds: updatedMembers,
        memberCount: updatedMembers.length,
        lastActivityAt: now,
        updatedAt: now
      });

      const memberRef = groupRef.collection('members').doc(uid);
      transaction.set(memberRef, {
        name: userData.name || 'Estudiante',
        avatarColor: userData.avatarColor || '#1A365D',
        role: 'member',
        score: 0,
        joinedAt: now
      });
    });

    return res.success({ message: 'Te has unido exitosamente al grupo' });
  } catch (error) {
    return res.fail(error.message, null, 400);
  }
}