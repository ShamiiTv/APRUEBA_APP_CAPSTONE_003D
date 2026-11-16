import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasTutorAccess,subscriptionEnd,SUBJECTS} from '../src/features/access.js';
test('tutores exigen el mismo permiso all vigente que móvil',()=>{const now=new Date('2026-11-16T12:00:00Z'),future='2026-11-17T12:00:00Z';const user={plan:'all',quota:{unlimited:true},currentPeriodEnd:future};assert.equal(hasTutorAccess(user,now),true);for(const patch of [{plan:'uni'},{plan:'free'},{quota:{unlimited:false}},{currentPeriodEnd:'2026-11-15T12:00:00Z'},{currentPeriodEnd:null}])assert.equal(hasTutorAccess({...user,...patch},now),false);});
test('timestamps Firebase y fechas ISO tienen el mismo vencimiento',()=>{const date='2026-11-17T12:00:00Z';assert.equal(subscriptionEnd({currentPeriodEnd:{_seconds:Date.parse(date)/1000}}).toISOString(),new Date(date).toISOString());assert.ok(SUBJECTS.some(([id])=>id==='m2'));});
