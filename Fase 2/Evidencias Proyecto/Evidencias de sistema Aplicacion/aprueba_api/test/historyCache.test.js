import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryCache } from '../src/services/historyCache.js';
test('Concurrent readers reuse history while users remain isolated', async () => {
 let reads=0;const cache=createHistoryCache(async uid=>({uid,version:++reads}));
 const values=await Promise.all(Array.from({length:20},()=>cache('a')));
 assert.equal(reads,1);assert.ok(values.every(v=>v.uid==='a'&&v===values[0]));
 assert.equal((await cache('b')).uid,'b');assert.equal(reads,2);
 cache.invalidate('a');await cache('a');assert.equal(reads,3);
});
test('An in-flight old read cannot restore the cache after a committed answer', async () => {
 let release,reads=0;const cache=createHistoryCache(async()=>{reads++;if(reads===1)return new Promise(r=>{release=r});return {version:reads};});
 const old=cache('a');await Promise.resolve();cache.invalidate('a');
 assert.deepEqual(await cache('a'),{version:2});release({version:1});await old;
 assert.deepEqual(await cache('a'),{version:2});assert.equal(reads,2);
});
test('Expiration, eviction and failed reads permit fresh reads', async () => {
 let time=0,reads=0;const cache=createHistoryCache(async uid=>{reads++;if(uid==='bad')throw Error('unavailable');return {uid};},{ttlMs:100,maxEntries:1,now:()=>time});
 await cache('a');time=101;await cache('a');assert.equal(reads,2);
 await cache('b');await cache('a');assert.equal(reads,4);
 await assert.rejects(cache('bad'),/unavailable/);await assert.rejects(cache('bad'),/unavailable/);assert.equal(reads,6);
});
