import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
const project=process.env.QUOTA_TEST_PROJECT_ID;
if(!project?.startsWith('demo-'))throw Error('Only isolated demo- projects allowed');
Object.assign(process.env,{FIREBASE_PROJECT_ID:project,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',PAYMENTS_MODE:'paypal-sandbox'});
const {db}=await import('../src/config/firebase.js');
const {getStudyPlan,saveStudyPlan}=await import('../src/controllers/studyPlanController.js');
const {getNextQuestion,submitAnswer}=await import('../src/controllers/practiceController.js');
const {practiceDate}=await import('../src/services/practice.js');
const app=express();app.use(express.json(),(req,res,next)=>{req.user={sub:req.get('X-Fixture-User')};next();});
app.get('/study-plan',getStudyPlan);app.put('/study-plan',saveStudyPlan);app.get('/next',getNextQuestion);app.post('/answer',submitAnswer);
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const origin=`http://127.0.0.1:${server.address().port}`,users=[],questions=[];
for(const testId of ['m1','m2']){
 const ref=db.collection('questions').doc('quota-'+randomUUID());questions.push(ref);
 await ref.set({testId,difficulty:'d2',axis:'Fixture',statement:`Pregunta aislada ${ref.id}: 1+1`,options:['1','2','3','4'],correctAnswer:'B',explanation:{steps:['1+1=2']},status:'published',bankVersion:2});
}
async function user(patch={}){const ref=db.collection('users').doc('quota-'+randomUUID());users.push(ref);await ref.set({name:'Fixture',plan:'free',planStatus:'none',selectedTests:['m1'],quota:{date:practiceDate(),used:0},medals:{bronze:0},...patch});return ref;}
async function call(ref,path,body,method=body?'POST':'GET'){const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json','X-Fixture-User':ref.id},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
after(async()=>{for(const ref of users)await db.recursiveDelete(ref);for(const ref of questions)await ref.delete();await new Promise(r=>server.close(r));});
test('free targets are capped at actual 10/15/20 quota and cannot be forged',async()=>{
 for(const [cap,profile] of [[10,{}],[15,{school:'Fixture',age:18,region:'Región'}],[20,{school:'Fixture',age:18,region:'Región',address:{commune:'Comuna',street:'Calle 123'}}]]){
  const ref=await user(profile);
  assert.equal((await call(ref,'/study-plan',{dailyGoal:cap,testIds:['m1']},'PUT')).status,200);
  const rejected=await call(ref,'/study-plan',{dailyGoal:cap+1,testIds:['m1']},'PUT');assert.equal(rejected.status,400);assert.equal(rejected.error.code,'STUDY_GOAL_EXCEEDS_QUOTA');
  assert.equal((await call(ref,'/study-plan',{dailyGoal:100,testIds:['m1'],unlimited:true},'PUT')).status,400);
  assert.equal((await ref.get()).data().quota.used,0);
 }
});
test('all plan exceeds the free quota without consuming it and the goal does not block practice',async()=>{
 const ref=await user({plan:'all',planStatus:'active',currentPeriodEnd:new Date(Date.now()+86400000),quota:{date:practiceDate(),used:10}});
 assert.equal((await call(ref,'/study-plan',{dailyGoal:50,testIds:['m1','m2']},'PUT')).status,200);
 for(const question of questions){const r=await call(ref,'/answer',{questionId:question.id,selectedOption:'B'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.user.quota.unlimited,true);assert.equal(r.data.user.quota.used,10);}
 assert.equal((await call(ref,'/study-plan',{dailyGoal:1,testIds:['m1']},'PUT')).status,200);
 assert.equal((await call(ref,'/study-plan')).data.remainingGoal,0);
 assert.equal((await call(ref,'/next?testId=m2&difficulty=d2')).status,200);
});
test('single-test access survives exhausted free quota but does not unlock other tests; expiry adjusts only effective target',async()=>{
 const ref=await user({plan:'uni',planStatus:'active',subscriptionTestId:'m1',currentPeriodEnd:new Date(Date.now()+86400000),quota:{date:practiceDate(),used:10}});
 assert.equal((await call(ref,'/study-plan',{dailyGoal:50,testIds:['m1','m2']},'PUT')).status,200);
 assert.equal((await call(ref,'/study-plan',{dailyGoal:50,testIds:['m2']},'PUT')).status,400);
 assert.equal((await call(ref,'/next?testId=m1&difficulty=d2')).status,200);
 assert.equal((await call(ref,'/next?testId=m2&difficulty=d2')).status,403);
 assert.equal((await call(ref,'/answer',{questionId:questions[0].id,selectedOption:'B'})).status,200);
 assert.equal((await call(ref,'/answer',{questionId:questions[1].id,selectedOption:'B'})).status,403);
 await ref.update({currentPeriodEnd:new Date(Date.now()-1000)});
 const expired=(await call(ref,'/study-plan')).data;assert.equal(expired.settings.dailyGoal,10);assert.equal(expired.goalAdjusted,true);assert.equal(expired.requestedGoal,50);assert.equal((await ref.get()).data().studyPlan.dailyGoal,50);
 assert.equal((await call(ref,'/next?testId=m1&difficulty=d2')).status,403);
});
