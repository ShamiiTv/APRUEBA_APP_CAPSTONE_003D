// Per-user read cache only. Transactions must always read Firestore directly.
export function createHistoryCache(load, { ttlMs = 60_000, maxEntries = 100, now = Date.now } = {}) {
  const entries = new Map();
  async function read(uid) {
    let entry = entries.get(uid);
    if (entry?.value && entry.expires > now()) return entry.value;
    if (entry?.pending) return entry.pending;
    entry = { expires: 0 };
    entries.set(uid, entry);
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    entry.pending = Promise.resolve().then(() => load(uid)).then(value => {
      if (entries.get(uid) === entry) { entry.value = value; entry.expires = now() + ttlMs; }
      return value;
    }).catch(error => { if (entries.get(uid) === entry) entries.delete(uid); throw error; })
      .finally(() => { entry.pending = undefined; });
    return entry.pending;
  }
  read.invalidate = uid => entries.delete(uid);
  return read;
}
