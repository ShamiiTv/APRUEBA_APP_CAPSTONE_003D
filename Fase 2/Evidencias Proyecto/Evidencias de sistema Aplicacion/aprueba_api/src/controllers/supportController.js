import {fields,text,identifier,problem} from '../services/social.js';
import { db } from '../config/firebase.js';

// Crear ticket de soporte técnico/académico en colección raíz supportTickets
export async function createSupportTicket(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    fields(req.body,['subject','priority','message','channel']);
    const { subject, priority = 'med', message, channel = 'web' } = req.body;
    text(subject,150);text(message,4000);
    if(!['high','med','low'].includes(priority)||!['web','app','mobile'].includes(channel))throw problem('Prioridad o canal inválido');

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

    const batch=db.batch();
    batch.set(ticketRef,ticketData);

    // Subcolección oficial: supportTickets/{id}/messages
    batch.set(ticketRef.collection('messages').doc(),{
      authorId: uid,
      authorType: 'user',
      body: message.trim(),
      createdAt: now,
    });

    await batch.commit();
    return res.success({ id: ticketRef.id, ...ticketData }, null, 201);
  } catch (error) {
    return res.fail(error.status===400?error.message:'No se pudo completar la operación de soporte',null,error.status===400?400:503);
  }
}

// Listar tickets del usuario autenticado
export async function getMyTickets(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const snapshot = await db.collection('supportTickets')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50).get();

    const tickets = [];
    for (const doc of snapshot.docs) {
      const messagesSnap = await doc.ref.collection('messages').orderBy('createdAt', 'asc').limit(100).get();
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
    return res.fail(error.status===400?error.message:'No se pudo completar la operación de soporte',null,error.status===400?400:503);
  }
}

// Enviar solicitud de recorrección oficial (Capítulo 4: corrections)
export async function submitCorrection(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    fields(req.body,['questionId','reason','comment']);
    const { questionId, reason, comment } = req.body;
    identifier(questionId);
    if(!['wrong_answer','ambiguous','typo','bad_explanation','other'].includes(reason)|| (comment!==undefined && (typeof comment!=='string'||comment.length>2000)))throw problem('Motivo o comentario inválido');

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
      const current=await transaction.get(questionDoc.ref);
      if(!current.exists)throw problem('Pregunta no encontrada',404);
      const count=current.data().flagCount||0;
      if(!Number.isSafeInteger(count)||count<0||count>=Number.MAX_SAFE_INTEGER)throw problem('Contador inválido',409);
      transaction.set(correctionRef, correctionData);
      transaction.update(questionDoc.ref, {
        flagCount: count + 1,
        updatedAt: now,
      });
    });

    return res.success({ id: correctionRef.id, ...correctionData }, null, 201);
  } catch (error) {
    return res.fail(error.status===400?error.message:'No se pudo completar la operación de soporte',null,error.status===400?400:503);
  }
}