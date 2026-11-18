import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
const project=process.env.PAYPAL_TEST_PROJECT_ID;
if(!project?.startsWith('demo-'))throw Error('Only isolated demo- projects allowed');
Object.assign(process.env,{FIREBASE_PROJECT_ID:project,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',PAYMENTS_MODE:'paypal-sandbox',PAYPAL_CLIENT_ID:'fixture',PAYPAL_CLIENT_SECRET:'fixture',PAYPAL_PLAN_UNI:'P-UNI',PAYPAL_PLAN_ALL:'P-ALL',PAYPAL_WEBHOOK_ID:'fixture'});
const {db}=await import('../src/config/firebase.js');
const {responseHandler}=await import('../src/middleware/responseHandler.js');
const {createPaypalSubscription,getPaypalSubscription,cancelPaypalSubscription}=await import('../src/controllers/paypalController.js');
const {paypalWebhook}=await import('../src/services/paypalPlans.js');
const {subscribePlan}=await import('../src/controllers/plansController.js');
const uid=`paypal-fixture-${randomUUID()}`,other=`paypal-fixture-${randomUUID()}`;
const originalFetch=globalThis.fetch,remote=new Map();
let paid=false,wrongAmount=false,refunded=false,sequence=0,starts=0;
let releaseStarts;
const bothStarts=new Promise(resolve=>{releaseStarts=resolve;});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url);if(u.hostname==='127.0.0.1')return originalFetch(url,options);
 assert.equal(u.origin,'https://api-m.sandbox.paypal.com');
 const json=options.body?.startsWith('{')?JSON.parse(options.body):{};
 const result=value=>new Response(JSON.stringify(value),{status:200});
 if(u.pathname.endsWith('/oauth2/token'))return result({access_token:'fixture',expires_in:3600});
 if(u.pathname.endsWith('/verify-webhook-signature'))return result({verification_status:json.transmission_sig==='fixture-valid'?'SUCCESS':'FAILURE'});
 if(u.pathname==='/v1/billing/subscriptions'&&options.method==='POST'){
   const key=options.headers['PayPal-Request-Id'];
   let s=[...remote.values()].find(v=>v.requestKey===key);
   if(!s){s={id:`I-FIXTURE${++sequence}`,plan_id:json.plan_id,custom_id:json.custom_id,status:'APPROVAL_PENDING',requestKey:key};remote.set(s.id,s);}
   // Force both HTTP requests past the reservation before either can commit.
   starts++;if(starts===2)releaseStarts();if(starts<=2)await bothStarts;
   return result({...s,links:[{rel:'approve',href:`https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=${s.id}`}]});
 }
 const id=u.pathname.split('/')[4],s=remote.get(id);assert.ok(s,'remote subscription must exist');
 if(u.pathname.endsWith('/cancel')){s.status='CANCELLED';return new Response(null,{status:204});}
 if(u.pathname.endsWith('/transactions'))return result({transactions:paid?[{id:'PAYPAL-FIXTURE-SALE',status:refunded?'REFUNDED':'COMPLETED',time:new Date(Date.now()-10000).toISOString(),amount_with_breakdown:{gross_amount:{currency_code:'USD',value:wrongAmount?'0.01':'4.99'}}}]:[]});
 return result(s);
};
await db.collection('users').doc(uid).set({name:'Fixture',plan:'free',planStatus:'none'});
await db.collection('users').doc(other).set({name:'Other fixture',plan:'free',planStatus:'none'});
const app=express();app.use(express.json(),responseHandler,(req,res,next)=>{req.user={sub:req.get('X-Fixture-User')||uid};next();});
app.post('/start',createPaypalSubscription);app.get('/status',getPaypalSubscription);app.post('/cancel',cancelPaypalSubscription);app.post('/legacy',subscribePlan);app.post('/webhook',paypalWebhook);
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
const call=async(path,body,actor=uid,extraHeaders={})=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Fixture-User':actor,...(extraHeaders['paypal-transmission-sig']?{'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/fixture','paypal-transmission-id':'fixture','paypal-transmission-time':new Date().toISOString()}:{}),...extraHeaders},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
after(async()=>{globalThis.fetch=originalFetch;for(const id of remote.keys())await db.collection('paypalSandboxSubscriptions').doc(id).delete();await db.collection('paypalSandboxSales').doc('PAYPAL-FIXTURE-SALE').delete();for(const id of [uid,other])await db.recursiveDelete(db.collection('users').doc(id));await new Promise(r=>server.close(r));});
test('sandbox checkout: retry, no premature activation, ownership, paid confirmation and cancellation',async()=>{
 const body={planId:'all',billingCycle:'monthly',requestId:randomUUID()};
 const [a,b]=await Promise.all([call('/start',body),call('/start',body)]);assert.equal(a.status,200,JSON.stringify(a));assert.equal(b.status,200);assert.equal(a.data.subscription.id,b.data.subscription.id);assert.equal(remote.size,1);
 assert.equal((await call('/legacy',body)).status,503);
 assert.equal((await call('/status')).data.user.plan,'free');assert.equal((await call('/status',null,other)).data.subscription,null);
 const s=[...remote.values()][0];s.status='ACTIVE';assert.equal((await call('/status')).data.user.plan,'free');
 paid=true;wrongAmount=true;assert.equal((await call('/status')).data.user.plan,'free');wrongAmount=false;
 const active=await call('/status');assert.equal(active.data.user.plan,'all');assert.equal(active.data.user.planStatus,'active');
 await call('/status');assert.equal((await db.collection('users').doc(uid).collection('paypalSandboxPayments').get()).size,1);
 assert.equal((await call('/webhook',{event_type:'BILLING.SUBSCRIPTION.ACTIVATED',resource:{id:s.id}})).status,400);
 const cancelled=await call('/cancel',{});assert.equal(cancelled.status,200);assert.equal(cancelled.data.subscription.status,'CANCELLED');assert.equal(cancelled.data.user.plan,'all');
 assert.equal((await call('/cancel',{})).status,200);assert.equal((await call('/start',{...body,requestId:randomUUID()})).status,409);
 refunded=true;
 const event={event_type:'PAYMENT.SALE.REFUNDED',resource:{sale_id:'PAYPAL-FIXTURE-SALE'}};
 assert.equal((await call('/webhook',event,uid,{'paypal-transmission-sig':'fixture-valid'})).status,200);
 assert.equal((await db.collection('users').doc(uid).get()).data().plan,'free');
 assert.equal((await call('/webhook',event,uid,{'paypal-transmission-sig':'fixture-valid'})).status,200);
 const next=await call('/start',{...body,requestId:randomUUID()});assert.equal(next.status,200);
 assert.equal((await call('/cancel',{})).data.abandoned,true);
 assert.equal((await call('/status')).data.subscription,null);
});
