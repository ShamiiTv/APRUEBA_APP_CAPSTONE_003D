import { db } from '../config/firebase.js';
import { canPractice, optionsOf } from '../services/questionBank.js';
import { problem, fail, ok, fields, identifier, requestId, text, stableId, author, page, postView, commentView, accessPost, checkOperation } from '../services/social.js';

async function member(groupId, uid) {
  const doc = await db.collection('groups').doc(groupId).get();
  if (!doc.exists) throw problem('Grupo no encontrado', 404);
  if (!doc.data().memberIds?.includes(uid)) throw problem('Solo los miembros pueden acceder al grupo', 403);
}
export async function getPosts(req, res) {
  try {
    const uid = req.user.sub;
    let query = db.collection('posts').where('visibility', '==', 'public');
    let scope = 'public';
    if (req.query.groupId !== undefined) {
      const id = identifier(req.query.groupId);
      await member(id, uid);
      query = db.collection('posts').where('visibility', '==', 'group').where('groupId', '==', id);
      scope = `group:${id}`;
    }
    const result = await page(query, scope, req.query.cursor);
    const rows = await Promise.all(result.docs.map(async doc => postView(doc, (await doc.ref.collection('likes').doc(uid).get()).exists)));
    if (req.query.groupId !== undefined) await member(req.query.groupId, uid);
    return ok(res, rows, { nextCursor: result.nextCursor });
  } catch (error) { return fail(res, error); }
}
export async function createPost(req, res) {
  try {
    fields(req.body, ['text', 'questionId', 'groupId', 'requestId']);
    const input = { text: text(req.body.text, 3000), questionId: req.body.questionId === undefined ? null : identifier(req.body.questionId), groupId: req.body.groupId === undefined ? null : identifier(req.body.groupId) };
    const uid = req.user.sub, id = requestId(req.body);
    const ref = db.collection('posts').doc(stableId(uid, id));
    const userRef = db.collection('users').doc(uid), op = userRef.collection('socialOperations').doc(id);
    const signature = JSON.stringify(['post', input]);
    const result = await db.runTransaction(async tx => {
      const [user, previous] = await Promise.all([tx.get(userRef), tx.get(op)]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      let groupRef;
      if (input.groupId) {
        groupRef = db.collection('groups').doc(input.groupId);
        const group = await tx.get(groupRef);
        if (!group.exists || !group.data().memberIds?.includes(uid)) throw problem('Solo los miembros pueden publicar en el grupo', 403);
      }
      if (checkOperation(previous, signature)) {
        const existing = await tx.get(ref);
        if (!existing.exists) throw problem('La publicación ya no está disponible', 409);
        const like = await tx.get(ref.collection('likes').doc(uid));
        return { post: postView(existing, like.exists), replayed: true };
      }
      let question = null;
      if (input.questionId) {
        const doc = await tx.get(db.collection('questions').doc(input.questionId));
        if (!doc.exists || !canPractice(doc.data())) throw problem('La pregunta no está disponible para compartir', 409);
        const q = doc.data();
        if (groupRef) {
          const group = await tx.get(groupRef);
          if (q.testId !== group.data().subjectTestId) throw problem('La pregunta debe corresponder a la materia del grupo');
        }
        question = { id: doc.id, testId: q.testId, statement: q.statement, options: optionsOf(q).map(({id,text}) => ({id,text})) };
      }
      const now = new Date();
      const data = { authorUid: uid, author: author(user.data()), text: input.text, question, groupId: input.groupId, visibility: input.groupId ? 'group' : 'public', likeCount: 0, commentCount: 0, createdAt: now };
      tx.set(ref, data);
      tx.set(op, { signature, postId: ref.id, createdAt: now });
      if (groupRef) tx.update(groupRef, { lastActivityAt: now, updatedAt: now });
      return { post: { id: ref.id, ...data, createdAt: now.toISOString(), userLiked: false }, replayed: false };
    });
    return ok(res, result.post, { replayed: result.replayed }, result.replayed ? 200 : 201);
  } catch (error) { return fail(res, error); }
}
export async function toggleLike(req, res) {
  try {
    fields(req.body, ['liked']);
    if (typeof req.body.liked !== 'boolean') throw problem('Indica si deseas marcar o quitar Me gusta');
    const uid = req.user.sub, id = identifier(req.params.id);
    const ref = db.collection('posts').doc(id), likeRef = ref.collection('likes').doc(uid);
    const result = await db.runTransaction(async tx => {
      const post = await accessPost(tx, ref, uid);
      const [like, user] = await Promise.all([tx.get(likeRef), tx.get(db.collection('users').doc(uid))]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      let count = post.data().likeCount ?? 0;
      if (!Number.isSafeInteger(count) || count < 0) throw problem('El contador de reacciones es inválido', 409);
      if (like.exists !== req.body.liked) {
        count = Math.max(0, count + (req.body.liked ? 1 : -1));
        if (!Number.isSafeInteger(count)) throw problem('El contador supera el límite permitido', 409);
        if (req.body.liked) tx.set(likeRef, { createdAt: new Date() });
        else tx.delete(likeRef);
        tx.update(ref, { likeCount: count });
      }
      return { liked: req.body.liked, likeCount: count };
    });
    return ok(res, result);
  } catch (error) { return fail(res, error); }
}
export async function getComments(req, res) {
  try {
    const uid = req.user.sub, id = identifier(req.params.id), ref = db.collection('posts').doc(id);
    await db.runTransaction(tx => accessPost(tx, ref, uid));
    const result = await page(ref.collection('comments'), `comments:${id}`, req.query.cursor);
    await db.runTransaction(tx => accessPost(tx, ref, uid));
    return ok(res, result.docs.map(commentView), { nextCursor: result.nextCursor });
  } catch (error) { return fail(res, error); }
}
export async function addComment(req, res) {
  try {
    fields(req.body, ['text', 'requestId']);
    const input = text(req.body.text, 1000);
    const uid = req.user.sub, id = identifier(req.params.id), rid = requestId(req.body);
    const postRef = db.collection('posts').doc(id), ref = postRef.collection('comments').doc(stableId(uid, rid));
    const userRef = db.collection('users').doc(uid), op = userRef.collection('socialOperations').doc(rid);
    const signature = JSON.stringify(['comment', id, input]);
    const result = await db.runTransaction(async tx => {
      const post = await accessPost(tx, postRef, uid);
      const [user, previous] = await Promise.all([tx.get(userRef), tx.get(op)]);
      if (!user.exists) throw problem('Usuario no encontrado', 404);
      if (checkOperation(previous, signature)) {
        const existing = await tx.get(ref);
        if (!existing.exists) throw problem('El comentario ya no está disponible', 409);
        return { comment: commentView(existing), count: post.data().commentCount || 0, replayed: true };
      }
      const count = post.data().commentCount ?? 0;
      if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(count + 1)) throw problem('El contador de comentarios es inválido', 409);
      const now = new Date(), data = { authorUid: uid, author: author(user.data()), text: input, createdAt: now };
      tx.set(ref, data);
      tx.update(postRef, { commentCount: count + 1 });
      tx.set(op, { signature, postId: id, commentId: ref.id, createdAt: now });
      return { comment: { id: ref.id, author: data.author, text: input, createdAt: now.toISOString() }, count: count + 1, replayed: false };
    });
    return ok(res, result.comment, { commentCount: result.count, replayed: result.replayed });
  } catch (error) { return fail(res, error); }
}
