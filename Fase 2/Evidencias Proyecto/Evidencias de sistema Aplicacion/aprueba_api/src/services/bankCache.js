// Cache only shared bank content; never cache user history or answer awards.
export function createBankCache(load, { ttlMs = 60 * 60 * 1000, now = Date.now } = {}) {
  let value, expires = 0, pending;
  return async () => {
    if (value && now() < expires) return value;
    if (!pending) pending = Promise.resolve().then(load).then(result => {
      value = result; expires = now() + ttlMs; return result;
    }).finally(() => { pending = undefined; });
    return pending;
  };
}
