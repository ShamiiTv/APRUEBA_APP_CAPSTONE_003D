import { db } from '../config/firebase.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export async function getNextQuestion(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { testId = 'm1', difficulty = 'd2' } = req.query;

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        data: null,
        error: { message: 'Estudiante no encontrado', code: 'USER_NOT_FOUND' },
        meta: null,
      });
    }

    const userData = userDoc.data();
    const quota = userData.quota || { used: 0, max: 20, unlimited: false };

    // Verificación de cuota diaria
    if (!quota.unlimited && quota.used >= quota.max) {
      return res.status(403).json({
        data: { quotaExceeded: true },
        error: { message: 'Has alcanzado tu cuota diaria de preguntas', code: 'QUOTA_EXCEEDED' },
        meta: { quotaRemaining: 0 },
      });
    }

    // 1. Obtener IDs de preguntas respondidas por el alumno
    const answeredSnapshot = await db.collection('users')
      .doc(uid)
      .collection('answeredQuestions')
      .where('testId', '==', testId)
      .get();

    const answeredIds = new Set(answeredSnapshot.docs.map((doc) => doc.id));

    // 2. Consultar el banco oficial de preguntas sembrado en Firestore
    const questionsSnapshot = await db.collection('questions')
      .where('testId', '==', testId)
      .limit(60)
      .get();

    // 3. Filtrar para no repetir
    const availableDocs = questionsSnapshot.docs.filter((doc) => !answeredIds.has(doc.id));

    if (availableDocs.length === 0) {
      return res.json({
        data: { question: null, allCompleted: true },
        error: null,
        meta: { totalAvailable: 0, quotaRemaining: quota.unlimited ? 'Ilimitado' : (quota.max - quota.used) },
      });
    }

    // Tomar una pregunta aleatoria del grupo disponible
    const randomIndex = Math.floor(Math.random() * availableDocs.length);
    const chosenDoc = availableDocs[randomIndex];
    const qData = chosenDoc.data();

    // Ocultar respuesta correcta al cliente y normalizar opciones
    const { correctAnswer, stats, ...safeQuestion } = qData;

    const formattedOptions = Array.isArray(safeQuestion.options)
      ? safeQuestion.options.map((opt, idx) => {
          if (typeof opt === 'string') {
            return { id: LETTERS[idx] || String(idx + 1), text: opt };
          }
          return opt;
        })
      : [];

    return res.json({
      data: {
        question: {
          id: chosenDoc.id,
          ...safeQuestion,
          options: formattedOptions,
        },
        allCompleted: false,
      },
      error: null,
      meta: {
        testId,
        difficulty,
        quotaRemaining: quota.unlimited ? 'Ilimitado' : (quota.max - quota.used),
      },
    });
  } catch (error) {
    return res.status(500).json({
      data: null,
      error: { message: error.message, code: 'SERVER_ERROR' },
      meta: null,
    });
  }
}

export async function submitAnswer(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { questionId, selectedOption } = req.body;

    if (!questionId || !selectedOption) {
      return res.status(400).json({
        data: null,
        error: { message: 'questionId y selectedOption son requeridos', code: 'BAD_REQUEST' },
        meta: null,
      });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({
        data: null,
        error: { message: 'Estudiante no encontrado', code: 'USER_NOT_FOUND' },
        meta: null,
      });
    }

    const userData = userDoc.data();
    const quota = userData.quota || { used: 0, max: 20, unlimited: false };

    if (!quota.unlimited && quota.used >= quota.max) {
      return res.status(403).json({
        data: { quotaExceeded: true },
        error: { message: 'Cuota diaria agotada', code: 'QUOTA_EXCEEDED' },
        meta: null,
      });
    }

    const qDoc = await db.collection('questions').doc(questionId).get();
    if (!qDoc.exists) {
      return res.status(404).json({
        data: null,
        error: { message: 'La pregunta no existe en el banco', code: 'QUESTION_NOT_FOUND' },
        meta: null,
      });
    }

    const qData = qDoc.data();
    const correctAnswer = (qData.correctAnswer || 'A').trim().toUpperCase();
    const isCorrect = selectedOption.trim().toUpperCase() === correctAnswer;

    // Normalizar explicación según el esquema oficial
    let explanationText = '';
    if (typeof qData.explanation === 'object' && qData.explanation?.steps) {
      explanationText = qData.explanation.steps.join(' ');
    } else if (typeof qData.explanation === 'string') {
      explanationText = qData.explanation;
    } else {
      explanationText = 'Resolución oficial DEMRE disponible.';
    }

    const keyConcept = qData.explanation?.keyConcept || qData.requiredSkillText || '';
    const bronzeEarned = isCorrect ? 1 : 0;

    // Operación atómica en Firestore con transacciones (Épica E04)
    await db.runTransaction(async (transaction) => {
      const freshUser = await transaction.get(userRef);
      const curData = freshUser.data();
      const curQuota = curData.quota || { used: 0, max: 20 };
      const curMedals = curData.medals || { bronze: 0, silver: 0, gold: 0, diamond: 0, platinum: 0 };

      const updates = {
        'quota.used': curQuota.used + 1,
        'updatedAt': new Date(),
      };

      if (bronzeEarned > 0) {
        updates['medals.bronze'] = (curMedals.bronze || 0) + bronzeEarned;
      }

      transaction.update(userRef, updates);
    });

    // Registrar en answeredQuestions para excluirla de futuras sesiones
    await userRef.collection('answeredQuestions').doc(questionId).set({
      testId: qData.testId || 'm1',
      selectedOption,
      isCorrect,
      answeredAt: new Date(),
    });

    // Registrar auditoría en medalLedger (Épica E04)
    if (bronzeEarned > 0) {
      await userRef.collection('medalLedger').add({
        event: 'reward',
        tier: 'bronze',
        amount: bronzeEarned,
        reason: `Respuesta correcta en ítem ${questionId} (${qData.testId})`,
        createdAt: new Date(),
      });
    }

    const updatedDoc = await userRef.get();

    return res.json({
      data: {
        isCorrect,
        correctAnswer,
        explanation: explanationText,
        keyConcept,
        bronzeEarned,
        user: { uid: updatedDoc.id, ...updatedDoc.data() },
      },
      error: null,
      meta: {
        answeredAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      data: null,
      error: { message: error.message, code: 'SERVER_ERROR' },
      meta: null,
    });
  }
}