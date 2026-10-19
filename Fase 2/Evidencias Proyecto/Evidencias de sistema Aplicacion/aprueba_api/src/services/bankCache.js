// Cache only shared bank content; never cache user history or answer awards.
export function createBankCache(load, { ttlMs = 60 * 60 * 1000, now = Date.now } = {}) {
  let value, expires = 0, pending, revision = 0;
  async function read() {
    if (value && now() < expires) return value;
    if (pending) return pending;
    const startedRevision = revision;
    const operation = Promise.resolve().then(load).then(result => {
      if (revision === startedRevision) { value = result; expires = now() + ttlMs; }
      return result;
    }).finally(() => { if (pending === operation) pending = undefined; });
    pending = operation;
    return operation;
  }
  read.invalidate = () => { revision++; value = undefined; expires = 0; pending = undefined; };
  return read;
}
