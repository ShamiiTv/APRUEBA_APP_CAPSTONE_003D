import { FieldPath, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

export const TEST_IDS = ['m1', 'm2', 'lectora', 'cien', 'hist'];
export const problem = (message, status = 400) => Object.assign(new Error(message), { status });
export const fail = (res, error) => res.status(error.status || 503).json({ data: null, error: { message: error.status ? error.message : 'No se pudo completar la operación. Intenta nuevamente.' }, meta: null });
export const ok = (res, data, meta = null, status = 200) => res.status(status).json({ data, error: null, meta });
export function fields(body, allowed) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw problem('Solicitud inválida');
}
export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw problem('Identificador inválido');
  return value;
}
export function requestId(body) {
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(body.requestId)) throw problem('Identificador de solicitud inválido');
  return body.requestId;
}
export function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw problem(`El texto debe tener entre 1 y ${max} caracteres`);
  return value.trim();
}
export function groupLimit(user) {
  if (!['active', 'trialing'].includes(user.planStatus)) return 1;
  return user.plan === 'all' ? 0 : user.plan === 'uni' ? 3 : 1;
}
export const stableId = (uid, id) => createHash('sha256').update(JSON.stringify([uid, id])).digest('hex');
export const author = user => ({ name: typeof user.name === 'string' ? user.name : 'Estudiante' });
export function dateISO(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
export function cursor(doc, scope) {
  const stamp = doc.get('createdAt');
  if (!stamp || !Number.isInteger(stamp.seconds)) throw problem('No se pudo obtener la fecha de la publicación', 503);
  return Buffer.from(JSON.stringify({ scope, seconds: stamp.seconds, nanos: stamp.nanoseconds, id: doc.id })).toString('base64url');
}
export async function page(query, scope, rawCursor) {
  let ordered = query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
  if (rawCursor !== undefined) {
    if (typeof rawCursor !== 'string' || rawCursor.length > 600) throw problem('Cursor inválido');
    let c;
    try { c = JSON.parse(Buffer.from(rawCursor, 'base64url').toString()); } catch { throw problem('Cursor inválido'); }
    if (!c || c.scope !== scope || !Number.isSafeInteger(c.seconds) || c.seconds < 0 || c.seconds > 253402300799 || !Number.isInteger(c.nanos) || c.nanos < 0 || c.nanos > 999999999) throw problem('Cursor inválido');
    identifier(c.id);
    ordered = ordered.startAfter(new Timestamp(c.seconds, c.nanos), c.id);
  }
  const snapshot = await ordered.limit(21).get();
  const docs = snapshot.docs.slice(0, 20);
  return { docs, nextCursor: snapshot.size > 20 ? cursor(docs.at(-1), scope) : null };
}
export function postView(doc, liked = false) {
  const data = doc.data();
  return { id: doc.id, authorUid: data.authorUid, author: { name: data.author?.name || 'Estudiante' }, text: data.text || '', question: data.question ? { id: data.question.id, testId: data.question.testId, statement: data.question.statement, options: Array.isArray(data.question.options) ? data.question.options.map(option => typeof option === 'string' ? option : { id: option.id, text: option.text }) : [] } : null, likeCount: data.likeCount || 0, commentCount: data.commentCount || 0, userLiked: liked, createdAt: dateISO(data.createdAt) };
}
export function commentView(doc) {
  const data = doc.data();
  return { id: doc.id, author: { name: data.author?.name || 'Estudiante' }, text: data.text || '', createdAt: dateISO(data.createdAt) };
}
export async function accessPost(tx, ref, uid) {
  const doc = await tx.get(ref);
  if (!doc.exists || doc.data().deleted === true) throw problem('Publicación no encontrada', 404);
  const data = doc.data();
  if (data.visibility === 'group') {
    if (!data.groupId) throw problem('Publicación no encontrada', 404);
    const group = await tx.get(ref.firestore.collection('groups').doc(data.groupId));
    if (!group.exists || !group.data().memberIds?.includes(uid)) throw problem('Solo los miembros pueden acceder a esta publicación', 403);
  } else if (data.visibility !== 'public') throw problem('Publicación no encontrada', 404);
  return doc;
}
export function checkOperation(doc, signature) {
  if (!doc.exists) return false;
  if (doc.data().signature !== signature) throw problem('Esta solicitud ya corresponde a otra operación', 409);
  return true;
}
