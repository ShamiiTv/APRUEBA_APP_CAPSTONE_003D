import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = new EventTarget();
const originalFetch = globalThis.fetch;
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { apiFetch, saveTokens, clearSession } = await vite.ssrLoadModule('/src/api/client.js');
after(async () => { globalThis.fetch = originalFetch; delete globalThis.localStorage; delete globalThis.window; await vite.close(); });
const reply = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

test('concurrent expired access requests share renewal and retry with new token', async () => {
  saveTokens({ accessToken: 'expired', refreshToken: 'refresh' });
  let renewals = 0;
  let retries = 0;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      renewals++;
      await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(JSON.parse(options.body).refreshToken, 'refresh');
      return reply(200, { data: { tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } } });
    }
    if (options.headers.Authorization === 'Bearer expired') return reply(401, { error: { message: 'Expired' } });
    assert.equal(options.headers.Authorization, 'Bearer new-access');
    retries++;
    return reply(200, { data: { success: true } });
  };
  const results = await Promise.all([apiFetch('/auth/me'), apiFetch('/groups')]);
  assert.ok(results.every(res => res.data.success));
  assert.equal(renewals, 1);
  assert.equal(retries, 2);
});

test('bad login does not silently renew an existing session', async () => {
  saveTokens({ accessToken: 'previous-access', refreshToken: 'previous-refresh' });
  let calls = 0;
  globalThis.fetch = async url => { calls++; assert.ok(url.endsWith('/auth/login')); return reply(401, { error: { message: 'Credenciales inválidas' } }); };
  await assert.rejects(apiFetch('/auth/login', { method: 'POST' }), /Credenciales/);
  assert.equal(calls, 1);
});

test('rejected refresh clears both tokens and announces ended session', async () => {
  saveTokens({ accessToken: 'expired', refreshToken: 'revoked' });
  let ended = false;
  window.addEventListener('aprueba:session-ended', () => { ended = true; }, { once: true });
  globalThis.fetch = async () => reply(401, { error: { message: 'Expired' } });
  await assert.rejects(apiFetch('/auth/me'), /expiró/);
  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('refreshToken'), null);
  assert.equal(ended, true);
});

test('temporary renewal failure preserves tokens for retry', async () => {
  saveTokens({ accessToken: 'expired', refreshToken: 'valid-refresh' });
  globalThis.fetch = async url => reply(url.endsWith('/auth/refresh') ? 503 : 401, { error: { message: 'Unavailable' } });
  await assert.rejects(apiFetch('/auth/me'), /renovar/);
  assert.equal(localStorage.getItem('refreshToken'), 'valid-refresh');
});

test('in-flight renewal cannot restore session after logout', async () => {
  saveTokens({ accessToken: 'expired', refreshToken: 'valid-refresh' });
  globalThis.fetch = async url => {
    if (url.endsWith('/auth/refresh')) { clearSession(); return reply(200, { data: { tokens: { accessToken: 'new', refreshToken: 'new' } } }); }
    return reply(401, { error: { message: 'Expired' } });
  };
  await assert.rejects(apiFetch('/auth/me'), /sesión cambió/);
  assert.equal(localStorage.getItem('token'), null);
});

test('a session revoked during renewal ends after failed retry', async () => {
  saveTokens({ accessToken: 'expired', refreshToken: 'refresh' });
  globalThis.fetch = async url => url.endsWith('/auth/refresh')
    ? reply(200, { data: { tokens: { accessToken: 'revoked', refreshToken: 'revoked-refresh' } } })
    : reply(401, { error: { message: 'Sesión revocada' } });
  await assert.rejects(apiFetch('/auth/me'), /revocada/);
  assert.equal(localStorage.getItem('token'), null);
});
