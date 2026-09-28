import { db } from '../config/firebase.js';

// Crear ticket de soporte técnico/académico en colección raíz supportTickets
export async function createSupportTicket(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { subject, priority = 'med', message, channel = 'web' } = req.body;

    if (!subject || !message) {
      return res.fail('Asunto y mensaje son obligatorios', null, 400);
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    const userData = userDoc.data();

    const now = new Date();
    const ticketRef = db.collection('supportTickets').doc();

    const ticketData = {
      subject: subject.trim(),
      userId: uid,
      userName: userData.name || 'Estudiante',
      priority, // high | med | low
      status: 'open', // open | progress | closed
      channel,
      assigneeId: null,
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.set(ticketData);

    // Subcolección oficial: supportTickets/{id}/messages
    await ticketRef.collection('messages').add({
      authorId: uid,
      authorType: 'user',
      body: message.trim(),
      createdAt: now,
    });

    return res.success({ id: ticketRef.id, ...ticketData }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Listar tickets del usuario autenticado
export async function getMyTickets(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const snapshot = await db.collection('supportTickets')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = [];
    for (const doc of snapshot.docs) {
      const messagesSnap = await doc.ref.collection('messages').orderBy('createdAt', 'asc').get();
      const messages = [];
      messagesSnap.forEach((mDoc) => messages.push({ id: mDoc.id, ...mDoc.data() }));

      tickets.push({
        id: doc.id,
        ...doc.data(),
        messages,
      });
    }

    return res.success(tickets);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Enviar solicitud de recorrección oficial (Capítulo 4: corrections)
export async function submitCorrection(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { questionId, reason, comment } = req.body;

    if (!questionId || !reason) {
      return res.fail('questionId y motivo (reason) son obligatorios', null, 400);
    }

    const [userDoc, questionDoc] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('questions').doc(questionId).get(),
    ]);

    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    if (!questionDoc.exists) return res.fail('Pregunta no encontrada', null, 404);

    const userData = userDoc.data();
    const qData = questionDoc.data();
    const now = new Date();
    const correctionRef = db.collection('corrections').doc();

    const correctionData = {
      questionId,
      questionTestId: qData.testId || 'm1',
      questionStatement: qData.statement || '',
      userId: uid,
      userName: userData.name || 'Estudiante',
      reason, // wrong_answer | ambiguous | typo | bad_explanation | other
      comment: comment ? comment.trim() : '',
      status: 'pending', // pending | confirmed | rejected
      potentialReward: { tier: 'bronze', amount: 250 }, // Recompensa oficial de 250 bronces
      rewardGranted: null,
      questionPatch: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: now,
    };

    // Registrar en Firestore y aumentar flagCount de la pregunta atómicamente
    await db.runTransaction(async (transaction) => {
      transaction.set(correctionRef, correctionData);
      transaction.update(questionDoc.ref, {
        flagCount: (qData.flagCount || 0) + 1,
        updatedAt: now,
      });
    });

    return res.success({ id: correctionRef.id, ...correctionData }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}