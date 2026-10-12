import test from 'node:test';
import assert from 'node:assert/strict';
import { createBankCache } from '../src/services/bankCache.js';
test('Concurrent navigation shares one bank read and expiration reloads it', async () => {
  let reads=0, time=0;
  const load=createBankCache(async()=>({version:++reads}),{ttlMs:100,now:()=>time});
  const results=await Promise.all(Array.from({length:20},()=>load()));
  assert.equal(reads,1); assert.ok(results.every(r=>r===results[0]));
  time=99; await load(); assert.equal(reads,1);
  time=100; assert.equal((await load()).version,2);
});
test('Failed bank reads are retriable and never stored as a valid bank', async () => {
  let reads=0;
  const load=createBankCache(async()=>{if(++reads===1)throw Error('quota');return [];});
  await assert.rejects(load(),/quota/); assert.deepEqual(await load(),[]); assert.equal(reads,2);
});
