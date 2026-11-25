import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyQuota} from '../src/services/practice.js';
import {profilePatch} from '../src/services/profileSettings.js';
import {difficultyLevels} from '../src/services/difficultyLevels.js';
const now=new Date('2026-10-21T18:00:00Z');
test('free quota requires complete school data before address bonus and ignores legacy quota privileges',()=>{
 const user={quota:{date:'2026-10-21',used:9,max:999,unlimited:true}};
 assert.equal(dailyQuota(user,now).max,10);assert.equal(dailyQuota(user,now).unlimited,false);
 const school={...user,school:'Liceo',age:18,region:'Biobío'};
 assert.equal(dailyQuota({...school,age:null},now).max,10);
 assert.equal(dailyQuota(school,now).max,15);
 const full={...school,address:{commune:'Concepción',street:'Calle 123'}};
 assert.equal(dailyQuota(full,now).max,20);assert.equal(dailyQuota(full,now).used,9);
 assert.equal(dailyQuota({...full,region:''},now).max,15);
 assert.equal(dailyQuota(full,new Date('2026-10-22T18:00:00Z')).used,0);
});
test('single-test entitlement is scoped, expires and cannot be forged through the profile',()=>{
 const user={plan:'uni',planStatus:'active',subscriptionTestId:'m1',currentPeriodEnd:'2026-11-21T18:00:00Z'};
 assert.equal(dailyQuota(user,now,'m1').unlimited,true);
 assert.equal(dailyQuota(user,now,'m2').unlimited,false);
 assert.equal(dailyQuota(user,new Date('2026-11-22T18:00:00Z'),'m1').unlimited,false);
 for(const field of ['subscriptionTestId','currentPeriodEnd','paymentMode','emailVerified','phoneVerified','linkedProviders'])assert.throws(()=>profilePatch({[field]:'forged'}));
});
test('personal details reject malformed values without accepting quota or security fields',()=>{
 assert.equal(profilePatch({phone:'+56 9 1234 5678'}).phone,'+56912345678');
 assert.deepEqual(profilePatch({age:18,address:{commune:' Santiago ',street:' Calle 123 '}}),{age:18,address:{commune:'Santiago',street:'Calle 123'}});
 for(const input of [{age:'18'},{age:9},{age:100},{phone:'123'},{address:[]},{address:{commune:'A'}},{address:{commune:'A',street:'B',verified:true}}])assert.throws(()=>profilePatch(input));
});
test('levels bootstrap the first available difficulty and unlock the next at 20 real correct answers',()=>{
 const question={testId:'m1',difficulty:'d2',statement:'1 + 1',options:['1','2','3','4'],correctAnswer:'B',status:'published',bankVersion:2};
 const bank=Array.from({length:20},(_,index)=>({id:`q${index}`,question:{...question,statement:`Pregunta ${index}`}})),history={docs:[]};
 let levels=difficultyLevels('m1',history,bank);
 assert.equal(levels[1].unlocked,true);assert.equal(levels[2].unlocked,false);
 history.docs=Array.from({length:20},(_,index)=>({id:String(index),data:()=>({testId:'m1',questionId:`q${index}`,isCorrect:true})}));
 levels=difficultyLevels('m1',history,bank);assert.equal(levels[2].unlocked,true);
 assert.equal(difficultyLevels('m2',history,bank)[2].unlocked,false);
});
