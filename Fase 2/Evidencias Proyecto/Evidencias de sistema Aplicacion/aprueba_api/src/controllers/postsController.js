import { db } from '../config/firebase.js';

// Listar publicaciones del muro (ordenadas por fecha descendente)
export async function getPosts(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const snapshot = await db.collection('posts')
      .where('visibility', '==', 'public')
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get();

    const posts = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Validar si el usuario actual ya dio like
      let userLiked = false;
      if (uid) {
        const likeDoc = await doc.ref.collection('likes').doc(uid).get();
        userLiked = likeDoc.exists;
      }

      // Traer últimos comentarios de la subcolección
      const commentsSnap = await doc.ref.collection('comments')
        .orderBy('createdAt', 'asc')
        .limit(10)
        .get();

      const comments = [];
      commentsSnap.forEach((c) => comments.push({ id: c.id, ...c.data() }));

      posts.push({
        id: doc.id,
        ...data,
        userLiked,
        comments,
      });
    }

    return res.success(posts);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Crear una publicación en el muro
export async function createPost(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { text, question } = req.body;

    if (!text || text.trim() === '') {
      return res.fail('El contenido del post no puede estar vacío', null, 400);
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    const userData = userDoc.data();

    const now = new Date();
    const newPostRef = db.collection('posts').doc();

    const postPayload = {
      authorUid: uid,
      author: {
        name: userData.name || 'Estudiante',
        avatarColor: userData.avatarColor || '#1A365D',
      },
      text: text.trim(),
      question: question || null,
      likeCount: 0,
      commentCount: 0,
      visibility: 'public',
      createdAt: now,
    };

    await newPostRef.set(postPayload);

    return res.success({ id: newPostRef.id, ...postPayload, userLiked: false, comments: [] }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Alternar Me Gusta (Like / Unlike) transaccional
export async function toggleLike(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { id: postId } = req.params;

    const postRef = db.collection('posts').doc(postId);
    const likeRef = postRef.collection('likes').doc(uid);

    let liked = false;
    let newLikeCount = 0;

    await db.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) throw new Error('Publicación no encontrada');

      const likeDoc = await transaction.get(likeRef);
      const postData = postDoc.data();
      const currentLikes = postData.likeCount || 0;

      if (likeDoc.exists) {
        // Quitar like
        transaction.delete(likeRef);
        newLikeCount = Math.max(0, currentLikes - 1);
        liked = false;
      } else {
        // Dar like
        transaction.set(likeRef, { createdAt: new Date() });
        newLikeCount = currentLikes + 1;
        liked = true;
      }

      transaction.update(postRef, { likeCount: newLikeCount });
    });

    return res.success({ liked, likeCount: newLikeCount });
  } catch (error) {
    return res.fail(error.message, null, 400);
  }
}

// Agregar comentario a una publicación
export async function addComment(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { id: postId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.fail('El comentario no puede estar vacío', null, 400);
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    const userData = userDoc.data();

    const postRef = db.collection('posts').doc(postId);
    const commentRef = postRef.collection('comments').doc();
    const now = new Date();

    const commentData = {
      authorUid: uid,
      author: {
        name: userData.name || 'Estudiante',
        avatarColor: userData.avatarColor || '#1A365D',
      },
      text: text.trim(),
      createdAt: now,
    };

    await db.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) throw new Error('Publicación no encontrada');

      const currentCount = postDoc.data().commentCount || 0;
      transaction.set(commentRef, commentData);
      transaction.update(postRef, { commentCount: currentCount + 1 });
    });

    return res.success({ id: commentRef.id, ...commentData });
  } catch (error) {
    return res.fail(error.message, null, 400);
  }
}