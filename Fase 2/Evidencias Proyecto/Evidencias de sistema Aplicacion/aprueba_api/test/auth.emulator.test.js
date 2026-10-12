import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';

const project = process.env.AUTH_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw new Error('AUTH_TEST_PROJECT_ID debe empezar con demo-; nunca ejecutar contra producción');
process.env.FIREBASE_PROJECT_ID = project;
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.JWT_SECRET = 'emulator-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'emulator-test-refresh-secret';
process.env.NODE_ENV = 'test';
const { db, auth } = await import('../src/config/firebase.js');
const { default: routes } = await import('../src/routes/authRoutes.js');
const { responseHandler } = await import('../src/middleware/responseHandler.js');
const { authenticateToken, requireOnboarding } = await import('../src/middleware/auth.js');
const { getProgress } = await import('../src/controllers/progressController.js');
const { getStudyPlan } = await import('../src/controllers/studyPlanController.js');
const { default: groupsRoutes } = await import('../src/routes/groupsRoutes.js');
const { default: postsRoutes } = await import('../src/routes/postsRoutes.js');
const app = express();
app.use(express.json(), responseHandler);
app.use('/auth', routes);
app.get('/protected', authenticateToken, requireOnboarding, (req, res) => res.success({ allowed: true }));
app.get('/progress', authenticateToken, requireOnboarding, getProgress);
app.get('/study-plan', authenticateToken, requireOnboarding, getStudyPlan);
app.use('/groups', authenticateToken, requireOnboarding, groupsRoutes);
app.use('/posts', authenticateToken, requireOnboarding, postsRoutes);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const users = new Set();
after(async () => {
  for (const uid of users) {
    await db.recursiveDelete(db.collection('users').doc(uid));
    await auth.deleteUser(uid).catch(() => {});
  }
  await new Promise(resolve => server.close(resolve));
});

async function request(path, body, token, method = body ? 'POST' : 'GET') {
  const res = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, ...await res.json() };
}
async function codeFor(email) {
  const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${project}/oobCodes`);
  const data = await res.json();
  return data.oobCodes.findLast(code => code.email === email && code.requestType === 'PASSWORD_RESET')?.oobCode;
}

test('complete registration/login/onboarding/refresh/reset flow on Firebase emulators', async () => {
  const email = `auth-${randomUUID()}@example.test`;
  const password = 'Initial-password-123';
  const reg = await request('/auth/register', { name: 'Alumno Prueba', email, password });
  assert.equal(reg.status, 201, JSON.stringify(reg.error));
  users.add(reg.data.user.uid);
  assert.equal(reg.data.user.onboardingCompleted, false);
  const tokens = reg.data.tokens;
  const stored = (await db.collection('users').doc(reg.data.user.uid).get()).data();
  assert.equal(stored.password, undefined);
  assert.equal(stored.streak, 0);
  assert.equal(stored.lastActiveDate, null);
  assert.equal((await request('/progress')).status, 401);
  assert.equal((await request('/progress', undefined, tokens.accessToken)).status, 403);
  assert.equal((await request('/study-plan')).status,401);
  assert.equal((await request('/study-plan',undefined,tokens.accessToken)).status,403);
  for (const path of ['/groups','/posts']) {
    assert.equal((await request(path)).status,401);
    assert.equal((await request(path,undefined,tokens.accessToken)).status,403);
    assert.equal((await request(path,undefined,tokens.refreshToken)).status,401);
  }
  assert.equal((await request('/protected', undefined, tokens.accessToken)).status, 403);
  assert.equal((await request('/auth/login', { email, password: 'Incorrect-password' })).status, 401);
  assert.equal((await request('/auth/register', { name: 'Otro', email, password })).status, 409);
  assert.equal((await request('/auth/onboarding', { selectedTests: ['m1'], school: 'Colegio', region: 'Biobío' }, tokens.accessToken)).status, 200);
  assert.equal((await request('/protected', undefined, tokens.accessToken)).status, 200);
  const progress = await request('/progress', undefined, tokens.accessToken);
  assert.equal(progress.status, 200);
  assert.equal(progress.data.answered, 0);
  assert.equal(progress.data.streak, 0);
  assert.equal((await request('/study-plan',undefined,tokens.accessToken)).status,200);
  assert.equal((await request('/groups',undefined,tokens.accessToken)).status,200);
  assert.equal((await request('/posts',undefined,tokens.accessToken)).status,200);
  assert.equal((await request('/protected', undefined, tokens.refreshToken)).status, 401);
  assert.equal((await request('/auth/refresh', { refreshToken: tokens.refreshToken })).status, 200);
  const signedIn = await request('/auth/login', { email, password });
  assert.equal(signedIn.status, 200);
  assert.equal(signedIn.data.user.uid, reg.data.user.uid);
  // Firebase revocation timestamps have second precision.
  await new Promise(resolve => setTimeout(resolve, 1100));
  const forgot = await request('/auth/forgot-password', { email });
  assert.equal(forgot.status, 200);
  const code = await codeFor(email);
  assert.ok(code, 'El emulador debe producir un código de recuperación');
  const newPassword = 'Updated-password-456';
  assert.equal((await request('/auth/reset-password', { oobCode: code, password: newPassword })).status, 200);
  assert.equal((await request('/auth/reset-password', { oobCode: code, password: newPassword })).status, 400);
  assert.equal((await request('/auth/login', { email, password })).status, 401);
  assert.equal((await request('/auth/login', { email, password: newPassword })).status, 200);
  assert.equal((await request('/auth/me', undefined, tokens.accessToken)).status, 401);
  assert.equal((await request('/auth/refresh', { refreshToken: tokens.refreshToken })).status, 401);
  assert.equal((await request('/auth/forgot-password', { email: `unknown-${randomUUID()}@example.test` })).status, 200);
});

test('legacy Firestore account recovers password without losing UID or profile', async () => {
  const uid = `legacy-${randomUUID()}`;
  const email = `${uid}@example.test`;
  users.add(uid);
  await db.collection('users').doc(uid).set({ email, emailLower: email, name: 'Cuenta Antigua', medals: { bronze: 17 }, plan: 'free' });
  assert.equal((await request('/auth/login', { email, password: 'anything-123' })).status, 401);
  assert.equal((await request('/auth/forgot-password', { email })).status, 200);
  const code = await codeFor(email);
  assert.ok(code);
  assert.equal((await request('/auth/reset-password', { oobCode: code, password: 'Legacy-password-123' })).status, 200);
  const login = await request('/auth/login', { email, password: 'Legacy-password-123' });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.uid, uid);
  assert.equal(login.data.user.medals.bronze, 17);
  assert.equal((await request('/protected', undefined, login.data.tokens.accessToken)).status, 403);
});

test('profile PATCH persists preferences across login while protecting rewards and identity', async () => {
  const email=`profile-${randomUUID()}@example.test`;
  const password='Profile-password-123';
  const reg=await request('/auth/register',{ name:'Perfil inicial',email,password });
  assert.equal(reg.status,201);
  const uid=reg.data.user.uid;
  users.add(uid);
  const token=reg.data.tokens.accessToken;
  const edited=await request('/auth/profile',{ name:'  Nombre actualizado  ',school:' Colegio ',region:'',theme:'dark',locale:'en',selectedTests:['m2','hist'],difficulty:'d3',dailyReminder:false },token,'PATCH');
  assert.equal(edited.status,200,JSON.stringify(edited.error));
  assert.equal(edited.data.name,'Nombre actualizado');
  assert.equal(edited.data.school,'Colegio');
  assert.equal(edited.data.dailyReminder,false);
  assert.deepEqual(edited.data.selectedTests,['m2','hist']);
  assert.equal(edited.data.onboardingCompleted,false);
  assert.equal((await request('/auth/profile',{ name:'Other',quota:{ unlimited:true } },token,'PATCH')).status,400);
  assert.equal((await request('/auth/profile',{ name:{} },token,'PATCH')).status,400);
  const stored=(await db.collection('users').doc(uid).get()).data();
  assert.equal(stored.quota.unlimited,false);
  assert.equal(stored.medals.bronze,0);
  assert.equal(stored.plan,'free');
  const signedIn=await request('/auth/login',{ email,password });
  assert.equal(signedIn.data.user.theme,'dark');
  assert.equal(signedIn.data.user.locale,'en');
  assert.equal(signedIn.data.user.difficulty,'d3');
  assert.equal((await request('/auth/me',{ lang:'es' },token,'PUT')).data.locale,'es');
  assert.equal((await request('/auth/me',{ dailyReminder:true },token,'PATCH')).data.dailyReminder,true);
  assert.equal((await request('/auth/profile',{ theme:'light' },undefined,'PATCH')).status,401);
});
