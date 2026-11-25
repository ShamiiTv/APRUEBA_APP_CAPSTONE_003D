import { loadAnswerHistory } from '../services/answerHistory.js';
import { loadSharedBank } from '../services/sharedBank.js';
import { db } from '../config/firebase.js';
import { canPractice, contentId, optionsOf, normalize } from '../services/questionBank.js';
import { dailyQuota, dailyActivity, answeredContents } from '../services/practice.js';
import { studyActivity } from '../services/progress.js';
import { difficultyLevels } from '../services/difficultyLevels.js';
import { isSimilarQuestion } from '../services/similarQuestions.js';

const TESTS = ['m1', 'm2', 'lectora', 'cien', 'hist'];
const fail = (res, message, code, status, nextStep) => res.status(status).json({ data: null, error: { message, code, ...(nextStep ? {nextStep,details:[{nextStep}]} : {}) }, meta: null });
const problem = (message, code, status) => Object.assign(new Error(message), { code, status });
const remaining = quota => quota.unlimited ? null : Math.max(0, quota.max - quota.used);

export async function getLevels(req,res) {
  const testId=req.query.testId || 'm1';
  if(!TESTS.includes(testId))return fail(res,'Prueba inválida','BAD_REQUEST',400);
  try {
    const [history,bank,profile]=await Promise.all([loadAnswerHistory(req.user.sub),loadSharedBank(),db.collection("users").doc(req.user.sub).get()]);
    const selectable=dailyQuota(profile.data() || {},new Date(),testId).unlimited;
    return res.json({data:difficultyLevels(testId,history,bank).map(level=>({...level,unlocked:selectable && level.available>0})),error:null,meta:null});
  } catch {return fail(res,'No se pudieron cargar los niveles','LEVELS_UNAVAILABLE',503);}
}

async function legacyQuestions(ids, transaction) {
  const docs = [];
  for (let index = 0; index < ids.length; index += 100) {
    const refs = ids.slice(index, index + 100).map(id => db.collection('questions').doc(id));
    docs.push(...await (transaction ? transaction.getAll(...refs) : db.getAll(...refs)));
  }
  return docs;
}

export async function getNextQuestion(req, res) {
  const uid = req.user?.sub || req.user?.id;
  let { testId = 'm1', difficulty = 'd2' } = req.query;
  const {similarTo}=req.query;
  if(similarTo!==undefined && (typeof similarTo!=='string' || !/^[A-Za-z0-9_-]{1,200}$/.test(similarTo))) return fail(res,'Pregunta de referencia inválida','BAD_REQUEST',400);
  if (!TESTS.includes(testId) || !['d1', 'd2', 'd3'].includes(difficulty)) return fail(res, 'Prueba o dificultad inválida', 'BAD_REQUEST', 400);
  try {
    const relatedBank=similarTo ? await loadSharedBank() : null;
    const source=similarTo ? relatedBank.find(entry=>entry.id===similarTo && canPractice(entry.question)) : null;
    if(similarTo && !source) return fail(res,'La pregunta de referencia ya no está disponible','SIMILAR_SOURCE_UNAVAILABLE',404);
    if(source){testId=source.question.testId;difficulty=source.question.difficulty;}
    const userRef = db.collection('users').doc(uid);
    const state = await db.runTransaction(async transaction => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) throw problem('Estudiante no encontrado', 'USER_NOT_FOUND', 404);
      const user = doc.data();
      const quota = dailyQuota(user, new Date(), testId);
      if (user.quota?.date !== quota.date) transaction.update(userRef, { quota, updatedAt: new Date() });
      return { user: { uid, ...user, quota }, quota };
    });
    if (!state.quota.unlimited && remaining(state.quota) === 0) return fail(res, 'Has alcanzado tu cuota diaria de preguntas', 'QUOTA_EXCEEDED', 403, state.quota.nextStep);
    const fullHistory = await loadAnswerHistory(uid);
    const bank=relatedBank || await loadSharedBank();
    const levels=difficultyLevels(testId,fullHistory,bank);
    // Server selects across all available levels for uncovered tests.
    const mixed = !source && !state.quota.unlimited;
    const history = { docs: fullHistory.docs.filter(doc => doc.data().testId === testId) };
    const answered = await answeredContents(history, ids => legacyQuestions(ids));
    const seen = new Set();
    let chosen, total = 0, unanswered = 0;
    for (const entry of bank) {
      const question = entry.question;
      if (question.testId !== testId || !canPractice(question) || (!mixed && question.difficulty !== difficulty)) continue;
      if(source && !isSimilarQuestion(source.question,question)) continue;
      const identity = contentId(question);
      if (seen.has(identity)) continue;
      seen.add(identity); total++;
      if (answered.has(identity)) continue;
      unanswered++;
      if (Math.random() < 1 / unanswered) chosen = { doc: { id: entry.id }, question };
    }
    const publicQuestion = chosen ? {
      id: chosen.doc.id, testId, difficulty: chosen.question.difficulty, axis: chosen.question.axis,
      statement: chosen.question.statement, options: optionsOf(chosen.question),
    } : null;
    return res.json({
      data: { question: publicQuestion, levels, allCompleted: total > 0 && unanswered === 0, noQuestions: total === 0, user: state.user },
      error: null,
      meta: { testId, difficulty, totalAvailable: total, unanswered, quotaRemaining: remaining(state.quota), quotaDate: state.quota.date,
        ...(source?{similarity:{sourceQuestionId:source.id,axis:source.question.axis || '',criteria:'same-test-difficulty-axis-shared-concepts'}}:{}) },
    });
  } catch (error) {
    return fail(res, error.status ? error.message : 'No se pudo cargar la práctica', error.code || 'SERVER_ERROR', error.status || 503);
  }
}

export async function submitAnswer(req, res) {
  const uid = req.user?.sub || req.user?.id;
  const { questionId, selectedOption, elapsedMs = 0 } = req.body || {};
  if (typeof questionId !== 'string' || !questionId || questionId.length > 150 || questionId.includes('/') || typeof selectedOption !== 'string' || !/^[A-E]$/.test(selectedOption) || !Number.isInteger(elapsedMs) || elapsedMs < 0 || elapsedMs > 3600000) return fail(res, 'La pregunta, alternativa o tiempo no son válidos', 'BAD_REQUEST', 400);
  try {
    const userRef = db.collection('users').doc(uid);
    const qRef = db.collection('questions').doc(questionId);
    const result = await db.runTransaction(async transaction => {
      const [userDoc, qDoc] = await transaction.getAll(userRef, qRef);
      if (!userDoc.exists) throw problem('Estudiante no encontrado', 'USER_NOT_FOUND', 404);
      if (!qDoc.exists || !canPractice(qDoc.data())) throw problem('Esta pregunta no está disponible para practicar', 'QUESTION_UNAVAILABLE', 404);
      const q = qDoc.data();
      if (!optionsOf(q).some(option => option.id === selectedOption)) throw problem('La alternativa no pertenece a la pregunta', 'BAD_REQUEST', 400);
      const identity = contentId(q);
      const history = await transaction.get(userRef.collection('answeredQuestions'));
      const answered = await answeredContents(history, ids => legacyQuestions(ids, transaction));
      const user = userDoc.data();
      const now = new Date();
      const quota = dailyQuota(user, now, q.testId);
      const previous = answered.get(identity);
      const correctAnswer = q.correctAnswer;
      const explanation = typeof q.explanation === 'string' ? q.explanation : (q.explanation?.steps || []).join(' ');
      const feedback = { correctAnswer, explanation, keyConcept: q.explanation?.keyConcept || '' };
      // Reintentos devuelven el intento original, sin consumo ni premio adicional.
      if (previous) {
        const selected = previous.selectedText ? optionsOf(q).find(option => normalize(option.text) === normalize(previous.selectedText))?.id : previous.selectedOption;
        return { ...feedback, isCorrect: previous.isCorrect, selectedOption: selected, bronzeEarned: 0, alreadyAnswered: true, user: { uid, ...user, quota } };
      }
      if (!quota.unlimited && remaining(quota) === 0) throw problem('Cuota diaria agotada', 'QUOTA_EXCEEDED', 403);
      const isCorrect = selectedOption === correctAnswer;
      if (!quota.unlimited) quota.used++;
      const medals = { ...user.medals, bronze: (user.medals?.bronze || 0) + (isCorrect ? 1 : 0) };
      const verifiedActivity = studyActivity(history.docs.map(doc => doc.data()), now);
      const activity = dailyActivity(verifiedActivity, quota.date);
      transaction.update(userRef, { quota, medals, ...activity, updatedAt: now });
      transaction.set(userRef.collection('answeredQuestions').doc(identity), { questionId, contentId: identity, testId: q.testId, difficulty:q.difficulty,selectedOption, selectedText: optionsOf(q).find(option => option.id === selectedOption).text, isCorrect, elapsedMs, answeredAt: now });
      const stats = { ...q.stats, timesAnswered: (q.stats?.timesAnswered || 0) + 1, timesCorrect: (q.stats?.timesCorrect || 0) + (isCorrect ? 1 : 0), sumElapsedMs: (q.stats?.sumElapsedMs || 0) + elapsedMs };
      transaction.update(qRef, { stats });
      if (isCorrect) transaction.set(userRef.collection('medalLedger').doc(identity), { event: 'reward', tier: 'bronze', amount: 1, reason: `Respuesta correcta en ítem ${questionId} (${q.testId})`, createdAt: now });
      return { ...feedback, isCorrect, selectedOption, bronzeEarned: isCorrect ? 1 : 0, alreadyAnswered: false, user: { uid, ...user, quota, medals, ...activity } };
    });
    loadAnswerHistory.invalidate(uid);
    return res.json({ data: result, error: null, meta: { quotaRemaining: remaining(result.user.quota), quotaDate: result.user.quota.date } });
  } catch (error) {
    return fail(res, error.status ? error.message : 'No se pudo guardar la respuesta. Puedes reintentar.', error.code || 'SERVER_ERROR', error.status || 503);
  }
}
