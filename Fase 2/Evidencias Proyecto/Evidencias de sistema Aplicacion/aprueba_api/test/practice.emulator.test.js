import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';

const project = process.env.PRACTICE_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw new Error('PRACTICE_TEST_PROJECT_ID debe ser un proyecto demo- aislado');
process.env.FIREBASE_PROJECT_ID = project;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const { db } = await import('../src/config/firebase.js');
const { getNextQuestion, submitAnswer } = await import('../src/controllers/practiceController.js');
const { getProgress } = await import('../src/controllers/progressController.js');
const { getStudyPlan,saveStudyPlan } = await import('../src/controllers/studyPlanController.js');
const { dailyQuota, practiceDate } = await import('../src/services/practice.js');
const { contentId } = await import('../src/services/questionBank.js');
const { seedQuestions } = await import('../src/data/seedData.js');

const app = express();
app.use(express.json());
app.use((req, res, next) => { req.user = { sub: req.headers['x-test-user'] }; next(); });
app.get('/next', getNextQuestion);
app.post('/answer', submitAnswer);
app.get('/progress', getProgress);
app.get('/study-plan', getStudyPlan);
app.put('/study-plan', saveStudyPlan);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const users = [];
const fixturePrefix = `fixture-${randomUUID()}-`;
const fixture = Array.from({ length: 126 }, (_, index) => ({
  id: `${fixturePrefix}${String(index).padStart(3, '0')}`,
  data: { testId: 'm2', axis: 'Prueba', difficulty: 'd2', statement: `Ítem de prueba ${index}: ¿cuánto es 1 + 1?`, options: ['1', '2', '3', '4'], correctAnswer: 'B', explanation: { steps: ['1 + 1 = 2'], keyConcept: 'Suma' }, bankVersion: 2, status: 'published' },
}));
const batch = db.batch();
fixture.forEach(q => batch.set(db.collection('questions').doc(q.id), q.data));
await batch.commit();
after(async () => {
  for (const uid of users) await db.recursiveDelete(db.collection('users').doc(uid));
  const batch = db.batch();
  fixture.forEach(q => batch.delete(db.collection('questions').doc(q.id)));
  await batch.commit();
  await new Promise(resolve => server.close(resolve));
});

async function student(quota = {}) {
  const uid = `practice-${randomUUID()}`;
  users.push(uid);
  await db.collection('users').doc(uid).set({ medals: { bronze: 0 }, quota: { date: practiceDate(), used: 0, max: 20, unlimited: false, ...quota }, streak: 1, lastActiveDate: practiceDate() });
  return uid;
}
async function request(uid, path, body) {
  const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'X-Test-User': uid }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, ...await res.json() };
}
const answer = (q, selectedOption = 'B') => ({ questionId: q.id, selectedOption });

test('concurrent repeats award one medal, consume one question and preserve first answer', async () => {
  const uid = await student();
  const results = await Promise.all(Array.from({ length: 4 }, () => request(uid, '/answer', answer(fixture[0]))));
  assert.ok(results.every(r => r.status === 200), JSON.stringify(results));
  assert.equal(results.reduce((sum, r) => sum + r.data.bronzeEarned, 0), 1);
  const user = (await db.collection('users').doc(uid).get()).data();
  assert.equal(user.quota.used, 1);
  assert.equal(user.medals.bronze, 1);
  assert.equal((await db.collection('users').doc(uid).collection('medalLedger').get()).size, 1);
  const retry = await request(uid, '/answer', answer(fixture[0], 'A'));
  assert.equal(retry.data.selectedOption, 'B');
  assert.equal(retry.data.bronzeEarned, 0);
});

test('two different concurrent answers cannot both consume the final quota slot', async () => {
  const uid = await student({ used: 19 });
  const results = await Promise.all([request(uid, '/answer', answer(fixture[1])), request(uid, '/answer', answer(fixture[2]))]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 403]);
  assert.equal((await db.collection('users').doc(uid).get()).data().quota.used, 20);
});

test('next-day quota resets before fetching and submitting answers', async () => {
  const uid = await student({ date: '2020-01-01', used: 20 });
  const next = await request(uid, '/next?testId=m2');
  assert.equal(next.status, 200);
  assert.equal(next.meta.quotaRemaining, 20);
  assert.equal(next.data.user.quota.date, practiceDate());
  const submitted = await request(uid, '/answer', answer(fixture[3]));
  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.user.quota.used, 1);
});

test('pagination finds unanswered item beyond 100 and hides answer/explanation', async () => {
  const uid = await student({ unlimited: true });
  const batch = db.batch();
  fixture.slice(0, 125).forEach(q => batch.set(db.collection('users').doc(uid).collection('answeredQuestions').doc(contentId(q.data)), { testId: 'm2', contentId: contentId(q.data), selectedOption: 'B', isCorrect: true }));
  await batch.commit();
  const next = await request(uid, '/next?testId=m2');
  assert.equal(next.status, 200);
  assert.equal(next.data.question.id, fixture[125].id);
  assert.equal(next.meta.totalAvailable, 126);
  assert.equal(next.data.question.correctAnswer, undefined);
  assert.equal(next.data.question.explanation, undefined);
  assert.equal((await request(uid, '/answer', answer(fixture[125]))).status, 200);
  assert.equal((await request(uid, '/next?testId=m2')).data.allCompleted, true);
});

test('empty subject and unsupported difficulty do not pretend bank completion', async () => {
  const uid = await student();
  const next = await request(uid, '/next?testId=hist');
  assert.equal(next.data.noQuestions, true);
  assert.equal(next.data.allCompleted, false);
  assert.equal((await request(uid, '/next?testId=m2&difficulty=d1')).data.noQuestions, true);
  assert.equal((await request(uid, '/next?testId=m2&difficulty=invalid')).status, 400);
  assert.equal((await request(uid, '/answer', answer(fixture[0], 'E'))).status, 400);
});

test('legacy answered questions remain excluded and cannot be rewarded after migration', async () => {
  const uid = await student();
  const oldRef = db.collection('questions').doc(`legacy-${randomUUID()}`);
  await oldRef.set({ ...fixture[4].data, bankVersion: 1 });
  await db.collection('users').doc(uid).collection('answeredQuestions').doc(oldRef.id).set({ testId: 'm2', selectedOption: 'B', isCorrect: true });
  const retry = await request(uid, '/answer', answer(fixture[4]));
  assert.equal(retry.status, 200);
  assert.equal(retry.data.alreadyAnswered, true);
  assert.equal(retry.data.bronzeEarned, 0);
  assert.equal((await db.collection('users').doc(uid).get()).data().quota.used, 0);
  await oldRef.delete();
});

test('progress reads only the signed-in student and reflects saved answers and real medals', async () => {
  const uid = await student();
  const other = await student();
  await db.collection('users').doc(uid).update({ streak: 9, lastActiveDate: '2026-10-08' });
  const empty = await request(uid, '/progress');
  assert.equal(empty.data.answered, 0);
  assert.equal(empty.data.streak, 0);
  assert.equal(empty.data.accuracy, null);
  await request(uid, '/answer', answer(fixture[0]));
  await request(uid, '/answer', answer(fixture[0]));
  await request(uid, '/answer', answer(fixture[1], 'A'));
  const result = await request(uid, '/progress');
  assert.equal(result.data.answered, 2);
  assert.equal(result.data.correct, 1);
  assert.equal(result.data.accuracy, 50);
  assert.equal(result.data.streak, 1);
  assert.equal(result.data.medals.bronze, 1);
  assert.equal(result.data.subjects.find(s => s.testId === 'm2').completed, 2);
  assert.equal((await request(other, '/progress')).data.answered, 0);
});

test('study plan persists only personal preferences and completes from saved practice answers', async () => {
  const uid=await student();
  const other=await student();
  const put=async settings => {
    const res=await fetch(`${base}/study-plan`,{ method:'PUT',headers:{ 'Content-Type':'application/json','x-test-user':uid },body:JSON.stringify(settings) });
    return { status:res.status,...await res.json() };
  };
  assert.equal((await put({ dailyGoal:2,testIds:['m2'] })).status,200);
  assert.equal((await put({ dailyGoal:2,testIds:['m2'],userId:other })).status,400);
  assert.equal((await request(uid,'/study-plan')).data.scheduled,2);
  await request(uid,'/answer',answer(fixture[0]));
  const plan=(await request(uid,'/study-plan')).data;
  assert.equal(plan.saved,true);
  assert.equal(plan.completedToday,1);
  assert.equal(plan.scheduled,1);
  assert.equal((await db.collection('users').doc(other).get()).data().studyPlan,undefined);
  assert.equal((await db.collection('users').doc(uid).get()).data().quota.used,1);
});

test('seeding actual bank twice is idempotent and preserves stats and medal balances', async () => {
  const initial = await seedQuestions();
  assert.equal(initial.published, 1360);
  const all = await db.collection('questions').where('testId', '==', 'm1').get();
  const first = all.docs.find(doc => doc.data().status === 'published');
  await first.ref.update({ 'stats.timesAnswered': 99, flagCount: 5 });
  const second = await seedQuestions();
  assert.equal(second.unique, initial.unique);
  assert.equal((await first.ref.get()).data().stats.timesAnswered, 99);
  assert.equal((await first.ref.get()).data().flagCount, 5);
  const uid = await student();
  const next = await request(uid, '/next?testId=m1');
  assert.equal(next.meta.totalAvailable, all.docs.filter(doc => doc.data().status === 'published').length);
  const pending = (await db.collection('questions').where('status', '==', 'pending_review').get()).docs[0];
  assert.ok(pending, 'the bank retains ambiguous questions pending review');
  assert.equal((await request(uid, '/answer', { questionId: pending.id, selectedOption: 'A' })).status, 404);
  const supplementary = (await db.collection('questions').where('pedagogicalUse', '==', 'complementario').get()).docs.find(doc => doc.data().status === 'published');
  assert.ok(supplementary, 'ready supplier supplementary questions are published');
  const included = await request(uid, '/answer', { questionId: supplementary.id, selectedOption: 'A' });
  assert.equal(included.status, 200);
  assert.equal((await request(uid, '/answer', { questionId: supplementary.id, selectedOption: 'A' })).data.alreadyAnswered, true);
});
