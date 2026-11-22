import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arenaCursor, notifyArena, waitArena } from '../src/services/arenaEvents.js';
test('updates wake only the affected account and never include user data', async () => {
  const old = arenaCursor('first'),
    controller = new AbortController(),
    waiting = waitArena('first', old, controller.signal);
  notifyArena('second');
  notifyArena('first');
  const result = await waiting;
  assert.deepEqual(Object.keys(result), ['cursor']);
  assert.notEqual(result.cursor, old);
});
test('aborted long polling cleans up and changed cursors return immediately', async () => {
  const controller = new AbortController(),
    cursor = arenaCursor('abort');
  const waiting = waitArena('abort', cursor, controller.signal);
  controller.abort();
  assert.equal((await waiting).cursor, cursor);
  notifyArena('abort');
  assert.equal((await waitArena('abort', cursor)).cursor, arenaCursor('abort'));
});
