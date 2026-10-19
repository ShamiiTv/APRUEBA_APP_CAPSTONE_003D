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

test('Invalidation reloads the bank and an older read cannot restore stale content', async () => {
 let release,reads=0;const load=createBankCache(async()=>{if(++reads===1)return new Promise(r=>{release=r});return {version:reads};});
 const old=load();await Promise.resolve();load.invalidate();
 assert.deepEqual(await load(),{version:2});release({version:1});await old;
 assert.deepEqual(await load(),{version:2});assert.equal(reads,2);
});
