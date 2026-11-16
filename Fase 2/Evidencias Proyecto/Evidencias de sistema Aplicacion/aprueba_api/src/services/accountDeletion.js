import { FieldPath } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

// Releer dentro de la transacción evita perder altas/bajas concurrentes.
export async function leaveGroupsOnDelete(uid, database = db) {
  const groups = await database.collection('groups').where('memberIds', 'array-contains', uid).get();
  for (const entry of groups.docs) {
    await database.runTransaction(async tx => {
      const group = await tx.get(entry.ref);
      if (!group.exists || !group.data().memberIds?.includes(uid)) return;
      const data = group.data();
      const members = data.memberIds.filter(id => id !== uid);
      const nextOwner = data.ownerId === uid ? members[0] || null : data.ownerId;
      const now = new Date();
      tx.update(group.ref, {
        memberIds: members, memberCount: members.length, ownerId: nextOwner,
        archived: members.length === 0, updatedAt: now, lastActivityAt: now,
      });
      tx.delete(group.ref.collection('members').doc(uid));
      if (nextOwner && nextOwner !== data.ownerId) {
        tx.set(group.ref.collection('members').doc(nextOwner), { role: 'owner' }, { merge: true });
      }
    });
  }
}

// Los Me gusta históricos solo identifican al usuario en el ID del documento.
// Recorrer IDs de publicaciones por páginas permite limpiarlos sin migrar datos
// ni exigir un índice nuevo de colección de grupos.
export async function removeUserReactions(uid, database = db) {
  let cursor;
  for (;;) {
    let query = database.collection('posts').orderBy(FieldPath.documentId()).select().limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) return;
    const reactions = await database.getAll(...page.docs.map(doc => doc.ref.collection('likes').doc(uid)));
    for (const reaction of reactions.filter(doc => doc.exists)) {
      const postRef = reaction.ref.parent.parent;
      await database.runTransaction(async tx => {
        const [post, like] = await tx.getAll(postRef, reaction.ref);
        if (!like.exists) return; // Reintentos no descuentan dos veces.
        if (post.exists) {
          const count = post.data().likeCount ?? 0;
          if (!Number.isSafeInteger(count) || count < 0) throw new Error('Contador de reacciones inválido');
          tx.update(postRef, { likeCount: Math.max(0, count - 1) });
        }
        tx.delete(reaction.ref);
      });
    }
    cursor = page.docs.at(-1);
  }
}
