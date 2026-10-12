import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { db, auth } from '../src/config/firebase.js';
import { login, register, forgotPassword, resetPassword, completeOnboarding } from '../src/controllers/authController.js';
import { generateTokens, authenticateToken, refreshSession, requireOnboarding, validateAuthConfiguration } from '../src/middleware/auth.js';

process.env.JWT_SECRET = 'isolated-test-access-secret-not-for-deployment';
process.env.JWT_REFRESH_SECRET = 'isolated-test-refresh-secret-not-for-deployment';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const originals = { fetch: globalThis.fetch, collection: db.collection, batch: db.batch, getUser: auth.getUser, createUser: auth.createUser, deleteUser: auth.deleteUser };
after(() => { globalThis.fetch = originals.fetch; db.collection = originals.collection; db.batch = originals.batch; auth.getUser = originals.getUser; auth.createUser = originals.createUser; auth.deleteUser = originals.deleteUser; });

function response() {
  return { status: 200, success(data, meta, status = 200) { this.status = status; this.data = data; return this; }, fail(message, details, status) { this.status = status; this.error = message; return this; } };
}
function identityResponse(ok, data) { return { ok, json: async () => data }; }
function profile(data = { plan: 'free', onboardingCompleted: false }) {
  const ref = { id: 'test-user', get: async () => ({ id: 'test-user', exists: true, data: () => data }), collection: () => ({ doc: () => ({}) }), update: async () => {} };
  db.collection = () => ({ doc: () => ref, where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) });
  return ref;
}

test('login rejects an incorrect password and never issues tokens', async () => {
  globalThis.fetch = async () => identityResponse(false, { error: { message: 'INVALID_PASSWORD' } });
  const res = response();
  await login({ body: { email: 'test@example.test', password: 'incorrect' } }, res);
  assert.equal(res.status, 401);
  assert.equal(res.data, undefined);
});

test('login uses verified Firebase UID, returns short access token and distinct refresh token', async () => {
  profile();
  globalThis.fetch = async (url, options) => {
    assert.ok(url.includes('signInWithPassword'));
    assert.equal(JSON.parse(options.body).password, 'valid-password');
    return identityResponse(true, { localId: 'test-user' });
  };
  const res = response();
  await login({ body: { email: 'TEST@example.test', password: 'valid-password' } }, res);
  assert.equal(res.status, 200);
  assert.equal(res.data.user.uid, 'test-user');
  const decoded = jwt.verify(res.data.tokens.accessToken, process.env.JWT_SECRET);
  assert.equal(decoded.exp - decoded.iat, 900);
  assert.equal(decoded.type, 'access');
  assert.equal(jwt.verify(res.data.tokens.refreshToken, process.env.JWT_REFRESH_SECRET).type, 'refresh');
});

test('registration validates types and length before creating identity', async () => {
  auth.createUser = () => { throw new Error('must not be called'); };
  const res = response();
  await register({ body: { name: {}, email: 'bad', password: '123' } }, res);
  assert.equal(res.status, 400);
});

test('registration starts onboarding incomplete, keeps password outside Firestore and rolls back Auth on batch failure', async () => {
  profile();
  let deleted;
  const writes = [];
  auth.createUser = async payload => { assert.equal(payload.password, 'valid-password'); return { uid: payload.uid }; };
  auth.deleteUser = async uid => { deleted = uid; };
  db.batch = () => ({ set(ref, data) { writes.push(data); }, commit: async () => { throw new Error('database unavailable'); } });
  const res = response();
  await register({ body: { name: 'Test Student', email: 'test@example.test', password: 'valid-password' } }, res);
  assert.equal(res.status, 503);
  assert.equal(deleted, 'test-user');
  assert.equal(writes[0].onboardingCompleted, false);
  assert.equal(writes[0].password, undefined);
});

test('refresh token cannot authorize protected requests', async () => {
  const tokens = generateTokens({ id: 'test-user' });
  const res = response();
  await authenticateToken({ headers: { authorization: `Bearer ${tokens.refreshToken}` } }, res, () => assert.fail('unauthorized next'));
  assert.equal(res.status, 401);
});

test('reset/disabled identities invalidate access and refresh sessions', async () => {
  const tokens = generateTokens({ id: 'test-user', authTime: Date.now() - 60000 });
  auth.getUser = async () => ({ disabled: false, tokensValidAfterTime: new Date().toISOString() });
  const access = response();
  await authenticateToken({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, access, () => assert.fail('revoked session'));
  assert.equal(access.status, 401);
  const refresh = response();
  await refreshSession({ body: { refreshToken: tokens.refreshToken } }, refresh);
  assert.equal(refresh.status, 401);
  auth.getUser = async () => ({ disabled: true });
  await authenticateToken({ headers: { authorization: `Bearer ${tokens.accessToken}` } }, access, () => assert.fail('disabled account'));
  assert.equal(access.status, 401);
});

test('refresh preserves authentication time and reloads current plan', async () => {
  profile({ plan: 'all' });
  auth.getUser = async () => ({ disabled: false });
  const authTime = Date.now() - 10000;
  const tokens = generateTokens({ id: 'test-user', authTime });
  const res = response();
  await refreshSession({ body: { refreshToken: tokens.refreshToken } }, res);
  assert.equal(res.status, 200);
  const decoded = jwt.verify(res.data.tokens.accessToken, process.env.JWT_SECRET);
  assert.equal(decoded.authTime, authTime);
  assert.equal(decoded.plan, 'all');
});

test('password recovery does not expose unknown email or reset code', async () => {
  profile();
  globalThis.fetch = async () => identityResponse(false, { error: { message: 'EMAIL_NOT_FOUND' } });
  const res = response();
  await forgotPassword({ body: { email: 'unknown@example.test' } }, res);
  assert.equal(res.status, 200);
  assert.match(res.data.message, /Si existe/);
  assert.deepEqual(Object.keys(res.data), ['message']);
});

test('legacy recovery preserves UID and creates no known password', async () => {
  db.collection = () => ({ where: () => ({ limit: () => ({ get: async () => ({ docs: [{ id: 'legacy-user' }] }) }) }) });
  auth.getUser = async () => { throw Object.assign(new Error(), { code: 'auth/user-not-found' }); };
  let created;
  auth.createUser = async value => { created = value; };
  globalThis.fetch = async () => identityResponse(true, { email: 'test@example.test' });
  const res = response();
  await forgotPassword({ body: { email: 'test@example.test' } }, res);
  assert.equal(res.status, 200);
  assert.deepEqual(created, { uid: 'legacy-user', email: 'test@example.test' });
});

test('expired/reused password reset code is rejected', async () => {
  globalThis.fetch = async () => identityResponse(false, { error: { message: 'INVALID_OOB_CODE' } });
  const res = response();
  await resetPassword({ body: { oobCode: 'expired', password: 'valid-password' } }, res);
  assert.equal(res.status, 400);
});

test('onboarding is enforced by API and rejects unknown test IDs', async () => {
  profile();
  const res = response();
  await requireOnboarding({ user: { sub: 'test-user' } }, res, () => assert.fail('onboarding bypass'));
  assert.equal(res.status, 403);
  await completeOnboarding({ user: { sub: 'test-user' }, body: { selectedTests: ['unknown'] } }, res);
  assert.equal(res.status, 400);
  profile({ onboardingCompleted: true });
  let allowed = false;
  await requireOnboarding({ user: { sub: 'test-user' } }, response(), () => { allowed = true; });
  assert.equal(allowed, true);
});

test('missing secrets fail configuration instead of falling back to public secret', () => {
  const original = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  assert.throws(validateAuthConfiguration, /JWT_SECRET/);
  process.env.JWT_SECRET = original;
});
