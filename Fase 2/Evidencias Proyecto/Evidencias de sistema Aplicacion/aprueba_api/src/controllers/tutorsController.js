import { db } from '../config/firebase.js';

// 1. Obtener tutores directamente desde la colección de Firestore
export async function getTutors(req, res) {
  try {
    const { testId } = req.query;
    let query = db.collection('tutors').where('active', '==', true);

    if (testId && testId !== 'all') {
      query = query.where('subjectTestId', '==', testId);
    }

    const snapshot = await query.get();
    const tutors = [];

    snapshot.forEach((doc) => {
      tutors.push({ id: doc.id, ...doc.data() });
    });

    return res.success(tutors);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// 2. Registrar solicitud en supportTickets ({channel: 'tutor'}) con subcolección messages
export async function requestTutorSession(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { tutorId, topic, message } = req.body;

    if (!tutorId || !message) {
      return res.fail('El tutor y el mensaje son obligatorios', null, 400);
    }

    const [userDoc, tutorDoc] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('tutors').doc(tutorId).get(),
    ]);

    if (!userDoc.exists) return res.fail('Usuario no encontrado', null, 404);
    if (!tutorDoc.exists) return res.fail('Tutor no encontrado', null, 404);

    const userData = userDoc.data();
    const tutorData = tutorDoc.data();
    const now = new Date();
    const ticketRef = db.collection('supportTickets').doc();

    const ticketPayload = {
      subject: `Tutoría: ${tutorData.name} (${tutorData.subjectLabel}) - ${topic || 'Refuerzo'}`,
      userId: uid,
      userName: userData.name || 'Estudiante',
      priority: 'med',
      status: 'open',
      channel: 'tutor',
      assigneeId: tutorId,
      tutorName: tutorData.name,
      createdAt: now,
      updatedAt: now,
    };

    await ticketRef.set(ticketPayload);

    // Mensaje en la subcolección supportTickets/{id}/messages
    await ticketRef.collection('messages').add({
      authorId: uid,
      authorType: 'user',
      body: message.trim(),
      createdAt: now,
    });

    return res.success({ id: ticketRef.id, ...ticketPayload }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}