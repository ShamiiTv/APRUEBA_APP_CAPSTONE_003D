// Long polling uses ordinary authenticated API requests, never tokens in URLs.
import { randomUUID } from 'node:crypto';
const boot = randomUUID(),
  versions = new Map(),
  listeners = new Map();
let sequence = 0;
export function arenaCursor(uid) {
  return versions.get(uid) || boot;
}
export function notifyArena(uid) {
  if (!uid) return;
  const cursor = boot + ':' + ++sequence;
  versions.delete(uid);
  versions.set(uid, cursor);
  while (versions.size > 2000) versions.delete(versions.keys().next().value);
  for (const wake of [...(listeners.get(uid) || [])]) wake(cursor);
}
export function waitArena(uid, cursor, signal) {
  const current = arenaCursor(uid);
  if (current !== cursor || signal?.aborted) return Promise.resolve({
    cursor: current
  });
  return new Promise(resolve => {
    const list = listeners.get(uid) || new Set();
    listeners.set(uid, list);
    const done = value => {
      clearTimeout(timer);
      list.delete(done);
      if (!list.size) listeners.delete(uid);
      signal?.removeEventListener('abort', abort);
      resolve({
        cursor: value
      });
    };
    const abort = () => done(arenaCursor(uid));
    const timer = setTimeout(() => done(arenaCursor(uid)), 10000);
    list.add(done);
    signal?.addEventListener('abort', abort, {
      once: true
    });
  });
}
