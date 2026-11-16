import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
const project=process.env.IMPROVEMENTS_TEST_PROJECT_ID;
if(!project?.startsWith('demo-'))throw new Error('Usa un proyecto demo- aislado');
process.env.FIREBASE_PROJECT_ID=project;
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
process.env.PAYMENTS_MODE='simulation';
const {db}=await import('../src/config/firebase.js');
const {responseHandler}=await import('../src/middleware/responseHandler.js');
const {getGifts,sendGifts}=await import('../src/controllers/giftsController.js');
const {createGroup,getGroup,getPublicGroups,joinGroup}=await import('../src/controllers/groupsController.js');
const {subscribePlan}=await import('../src/controllers/plansController.js');
const {requestTutorSession}=await import('../src/controllers/tutorsController.js');
const {updateProfile}=await import('../src/controllers/authController.js');
const {dailyQuota}=await import('../src/services/practice.js');
const app=express();app.use(express.json(),responseHandler,(req,res,next)=>{req.user={sub:req.headers['x-user']};next();});
app.get('/gifts',getGifts);app.post('/gifts',sendGifts);app.post('/groups',createGroup);app.get('/groups/public',getPublicGroups);app.get('/groups/:id',getGroup);app.post('/join',joinGroup);app.post('/plan',subscribePlan);app.post('/tutor',requestTutorSession);app.patch('/profile',updateProfile);
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`,users=[],groups=[];
async function user(bronze=0){const uid=randomUUID();users.push(uid);await db.collection('users').doc(uid).set({name:'Fixture',medals:{bronze},plan:'all',planStatus:'active',currentPeriodEnd:new Date(Date.now()+86400000)});return uid;}
async function request(uid,path,body,method=body?'POST':'GET'){const res=await fetch(base+path,{method,headers:{'content-type':'application/json','x-user':uid},...(body?{body:JSON.stringify(body)}:{})});const result={status:res.status,...await res.json()};if(path==='/groups'&&result.data?.id&&!groups.includes(result.data.id))groups.push(result.data.id);return result;}
async function cohort(sender,recipient){const created=await request(sender,'/groups',{name:'Fixture',visibility:'public',requestId:randomUUID()});assert.equal(created.status,201);assert.equal((await request(recipient,'/join',{groupId:created.data.id})).status,200);return created.data.id;}
after(async()=>{for(const id of groups)await db.recursiveDelete(db.collection('groups').doc(id));for(const id of users)await db.recursiveDelete(db.collection('users').doc(id));await new Promise(resolve=>server.close(resolve));});
test('concurrent gift retries transfer once, conserve medals, and write both ledgers',async()=>{
 const sender=await user(20),recipient=await user(2);await cohort(sender,recipient);
 const body={recipients:[{userId:recipient,amount:6}],requestId:randomUUID()};
 const responses=await Promise.all([1,2,3].map(()=>request(sender,'/gifts',body)));assert.ok(responses.every(res=>res.status===200),JSON.stringify(responses));
 assert.equal((await db.collection('users').doc(sender).get()).data().medals.bronze,14);
 assert.equal((await db.collection('users').doc(recipient).get()).data().medals.bronze,8);
 assert.equal((await request(sender,'/gifts')).data.daily.used,6);
 assert.equal((await db.collection('users').doc(recipient).collection('medalLedger').get()).size,1);
 assert.equal((await request(sender,'/gifts',{...body,recipients:[{userId:recipient,amount:5}]})).status,409);
});
test('competing gifts cannot exceed ten per Chile day; outsiders and self-gifts fail',async()=>{
 const sender=await user(100),recipient=await user(),outsider=await user();await cohort(sender,recipient);
 const responses=await Promise.all([1,2].map(()=>request(sender,'/gifts',{recipients:[{userId:recipient,amount:7}],requestId:randomUUID()})));
 assert.deepEqual(responses.map(res=>res.status).sort(),[200,409]);
 assert.equal((await request(sender,'/gifts',{recipients:[{userId:outsider,amount:1}],requestId:randomUUID()})).status,403);
 assert.equal((await request(sender,'/gifts',{recipients:[{userId:sender,amount:1}],requestId:randomUUID()})).status,400);
});
test('private groups are excluded from discovery and require the complete invitation',async()=>{
 const owner=await user(),other=await user();
 const created=await request(owner,'/groups',{name:'Privado',visibility:'private',requestId:randomUUID()});
 const id=created.data.id;
 assert.equal((await request(other,'/groups/public')).data.some(group=>group.id===id),false);
 assert.equal((await request(other,`/groups/${id}`)).status,403);
 assert.equal((await request(other,'/join',{groupId:id})).status,403);
 const detail=await request(owner,`/groups/${id}`);assert.ok(detail.data.inviteCode.includes(':'));
 assert.equal((await request(other,'/join',{groupId:detail.data.inviteCode})).status,200);
});
test('profile bonus completion changes quota once and preserves consumed questions',async()=>{
 const uid=await user();await db.collection('users').doc(uid).update({plan:'free',planStatus:'none',quota:{date:dailyQuota({}).date,used:10,max:20}});
 let res=await request(uid,'/profile',{school:'Liceo',age:18,region:'Los Ríos'},'PATCH');assert.equal(res.data.quota.max,15);assert.equal(res.data.quota.used,10);
 res=await request(uid,'/profile',{address:{commune:'Valdivia',street:'Calle 123'}},'PATCH');assert.equal(res.data.quota.max,20);assert.equal(res.data.quota.used,10);
 res=await request(uid,'/profile',{address:{commune:'Valdivia',street:'Calle 123'}},'PATCH');assert.equal(res.data.quota.max,20);
});
test('simulated plans never record actual payment and single-test access stays scoped',async()=>{
 const uid=await user();const body={planId:'uni',testId:'m2',requestId:randomUUID()};
 const responses=await Promise.all([request(uid,'/plan',body),request(uid,'/plan',body)]);assert.ok(responses.every(res=>res.status===200),JSON.stringify(responses));
 const profile=(await db.collection('users').doc(uid).get()).data();assert.equal(profile.planStatus,'simulated');assert.equal(dailyQuota(profile,new Date(),'m2').unlimited,true);assert.equal(dailyQuota(profile,new Date(),'m1').unlimited,false);
 const operation=(await db.collection('users').doc(uid).collection('planOperations').doc(body.requestId).get()).data();assert.equal(operation.amountCharged,0);
 assert.equal((await request(uid,'/plan',{...body,testId:'m1'})).status,409);
 assert.equal((await request(uid,'/plan',{planId:'uni',requestId:randomUUID()})).status,400);
});
test('tutor requests are explicitly simulated, idempotent, and scoped to the requester',async()=>{
 const uid=await user(),other=await user();const body={tutorId:'demo-m1',message:'Necesito refuerzo',requestId:randomUUID()};
 const responses=await Promise.all([request(uid,'/tutor',body),request(uid,'/tutor',body)]);assert.ok(responses.every(res=>res.data?.simulated===true));
 assert.equal((await db.collection('users').doc(uid).collection('tutorRequests').get()).size,1);assert.equal((await db.collection('users').doc(other).collection('tutorRequests').get()).size,0);
});
