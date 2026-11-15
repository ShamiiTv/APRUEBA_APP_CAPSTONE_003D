import { db } from '../config/firebase.js';

const collectionOf = uid => db.collection('users').doc(uid).collection('notifications');

function iso(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null;
  return date ? date.toISOString() : null;
}

export async function listNotifications(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const snap = await collectionOf(uid).orderBy('createdAt', 'desc').limit(50).get();
    const items = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type || '',
        title: d.title || '',
        body: d.body || '',
        read: d.read === true,
        createdAt: iso(d.createdAt),
      };
    });
    return res.success({ items, unread: items.filter(n => !n.read).length });
  } catch {
    return res.fail('No se pudieron cargar las notificaciones.', null, 503);
  }
}

export async function markNotificationRead(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const id = req.params.id;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return res.fail('Notificación inválida', null, 400);
    const ref = collectionOf(uid).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.fail('Notificación no encontrada', null, 404);
    await ref.update({ read: true });
    return res.success({ id, read: true });
  } catch {
    return res.fail('No se pudo marcar como leída.', null, 503);
  }
}