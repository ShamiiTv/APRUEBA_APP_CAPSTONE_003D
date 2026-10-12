import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
const project=process.env.MEDALS_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw new Error('Usa un proyecto demo- aislado');
process.env.FIREBASE_PROJECT_ID=project;
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080';
const {db}=await import('../src/config/firebase.js');
const {exchangeMedals,redeemBenefit,getMedalsSummary,getBenefits}=await import('../src/controllers/medalsController.js');
const {balances,operation,benefitTerms}=await import('../src/services/medals.js');
const app=express();app.use(express.json());app.use((req,res,next)=>{req.user={sub:req.headers['x-user']};next();});
app.post('/exchange',exchangeMedals);app.post('/redeem',redeemBenefit);app.get('/summary',getMedalsSummary);app.get('/benefits',getBenefits);
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const url=`http://127.0.0.1:${server.address().port}`;
const users=[],benefits=[];
async function user(medals){const id=randomUUID();users.push(id);await db.collection('users').doc(id).set({medals});return id;}
async function benefit(overrides={}){const id=randomUUID();benefits.push(id);await db.collection('benefits').doc(id).set({name:'Fixture',active:true,costPlatinum:2,stock:1,redeemedCount:0,...overrides});return id;}
async function request(uid,path,body){const r=await fetch(url+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-user':uid},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
after(async()=>{for(const id of users)await db.recursiveDelete(db.collection('users').doc(id));for(const id of benefits)await db.collection('benefits').doc(id).delete();await new Promise(r=>server.close(r));});
test('rejects malformed balances, request IDs, tiers and catalog costs',()=>{
 for(const raw of [{bronze:-1},{silver:1.5},{gold:'5'},{platinum:Number.MAX_SAFE_INTEGER+1},null])assert.throws(()=>balances(raw));
 assert.equal(balances({bronze:2}).platinum,0);
 assert.throws(()=>operation({fromTier:'platinum',requestId:randomUUID()},'exchange'));
 assert.throws(()=>operation({fromTier:'bronze',requestId:'short'},'exchange'));
 assert.throws(()=>benefitTerms({costPlatinum:0,stock:1}));
});
test('simultaneous repeats convert only once and conflicting reuse is rejected',async()=>{
 const uid=await user({bronze:15});const body={fromTier:'bronze',requestId:randomUUID()};
 const results=await Promise.all(Array.from({length:5},()=>request(uid,'/exchange',body)));
 assert.ok(results.every(r=>r.status===200),JSON.stringify(results));
 const summary=await request(uid,'/summary');assert.equal(summary.data.medals.bronze,10);assert.equal(summary.data.medals.silver,1);assert.equal(summary.data.history.length,2);assert.ok(summary.data.history[0].createdAt.endsWith('Z'));
 assert.equal((await request(uid,'/exchange',{...body,fromTier:'silver'})).status,409);
});
test('competing different exchanges cannot overspend',async()=>{
 const uid=await user({bronze:5});const results=await Promise.all([1,2].map(()=>request(uid,'/exchange',{fromTier:'bronze',requestId:randomUUID()})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await request(uid,'/summary')).data.medals.bronze,0);
});
test('benefit retry charges and reserves once with pending fulfillment',async()=>{
 const uid=await user({platinum:10});const id=await benefit();const body={benefitId:id,requestId:randomUUID()};
 const results=await Promise.all([request(uid,'/redeem',body),request(uid,'/redeem',body)]);
 assert.ok(results.every(r=>r.status===200),JSON.stringify(results));
 assert.equal(results[0].data.redemption.status,'pending');
 const summary=await request(uid,'/summary');assert.equal(summary.data.medals.platinum,8);assert.equal(summary.data.redemptions.length,1);assert.equal(summary.data.history.length,1);
 const b=(await db.collection('benefits').doc(id).get()).data();assert.equal(b.stock,0);assert.equal(b.redeemedCount,1);
 assert.equal((await request(uid,'/redeem',{...body,requestId:randomUUID()})).status,409);
});
test('two students competing for last stock yield only one reservation',async()=>{
 const id=await benefit();const ids=await Promise.all([user({platinum:5}),user({platinum:5})]);
 const results=await Promise.all(ids.map(uid=>request(uid,'/redeem',{benefitId:id,requestId:randomUUID()})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const amounts=await Promise.all(ids.map(async uid=>(await request(uid,'/summary')).data.medals.platinum));assert.deepEqual(amounts.sort(),[3,5]);
});
test('inactive, malformed and unaffordable benefits never debit balances',async()=>{
 const uid=await user({platinum:1});
 for(const overrides of [{active:false},{costPlatinum:0},{costPlatinum:2}]){
 const id=await benefit(overrides);assert.equal((await request(uid,'/redeem',{benefitId:id,requestId:randomUUID()})).status,409);
 }
 assert.equal((await request(uid,'/summary')).data.medals.platinum,1);
});
