import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasTutorAccess,subscriptionEnd,SUBJECTS} from '../src/features/access.js';
test('tutores exigen el mismo permiso all vigente que móvil',()=>{const now=new Date('2026-11-16T12:00:00Z'),future='2026-11-17T12:00:00Z';const user={plan:'all',quota:{unlimited:true},currentPeriodEnd:future};assert.equal(hasTutorAccess(user,now),true);for(const patch of [{plan:'uni'},{plan:'free'},{quota:{unlimited:false}},{currentPeriodEnd:'2026-11-15T12:00:00Z'},{currentPeriodEnd:null}])assert.equal(hasTutorAccess({...user,...patch},now),false);});
test('timestamps Firebase y fechas ISO tienen el mismo vencimiento',()=>{const date='2026-11-17T12:00:00Z';assert.equal(subscriptionEnd({currentPeriodEnd:{_seconds:Date.parse(date)/1000}}).toISOString(),new Date(date).toISOString());assert.ok(SUBJECTS.some(([id])=>id==='m2'));});

test('system translations preserve original user content and translate historical rewards',async()=>{
 const {uiText}=await import('../src/i18n/uiText.js');
 assert.equal(uiText('en','Competencia Lectora'),'Reading Comprehension');
 assert.equal(uiText('en','Inicio de sesión diario (día 3 seguido)'),'Daily sign in (3 consecutive days)');
 assert.equal(uiText('es','Inicio de sesión diario'),'Inicio de sesión diario');
 assert.equal(uiText('en','Mi grupo personal'),'Mi grupo personal');
});
