import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {randomUUID} from 'node:crypto';
const project=process.env.PARITY_TEST_PROJECT_ID;
if(!project?.startsWith('demo-'))throw Error('Usar proyecto demo- aislado');
Object.assign(process.env,{FIREBASE_PROJECT_ID:project,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',JWT_SECRET:'parity-isolated-access-secret',JWT_REFRESH_SECRET:'parity-isolated-refresh-secret',PAYMENTS_MODE:'simulation',NODE_ENV:'test'});
const {db,auth}=await import('../src/config/firebase.js');
const {responseHandler}=await import('../src/middleware/responseHandler.js');
const {authenticateToken,requireOnboarding}=await import('../src/middleware/auth.js');
const {getStudyPlan,saveStudyPlan}=await import('../src/controllers/studyPlanController.js');
const {getProgress}=await import('../src/controllers/progressController.js');
const app=express();app.use(express.json(),responseHandler);
app.use('/auth',(await import('../src/routes/authRoutes.js')).default);
for(const [prefix,file] of [['/notifications','notificationsRoutes'],['/groups','groupsRoutes'],['/posts','postsRoutes'],['/plans','plansRoutes'],['/medals','medalsRoutes']])app.use(prefix,authenticateToken,...(prefix==='/notifications'?[]:[requireOnboarding]),(await import(`../src/routes/${file}.js`)).default);
app.get('/study-plan',authenticateToken,requireOnboarding,getStudyPlan);app.put('/study-plan',authenticateToken,requireOnboarding,saveStudyPlan);app.get('/progress',authenticateToken,requireOnboarding,getProgress);
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
const users=[],refs=[];
after(async()=>{for(const ref of refs)await db.recursiveDelete(ref);for(const id of users){await db.recursiveDelete(db.collection('users').doc(id));await auth.deleteUser(id).catch(()=>{});}await new Promise(r=>server.close(r));});
async function request(path,body,token,method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
async function account(){const email=`parity-${randomUUID()}@example.test`,password='Only-testing-123';const reg=await request('/auth/register',{email,password,name:'Cuenta prueba',consent:true,locale:'en'});assert.equal(reg.status,201,JSON.stringify(reg));const uid=reg.data.user.uid;users.push(uid);await auth.updateUser(uid,{emailVerified:true});const token=reg.data.tokens.accessToken;assert.equal((await request('/auth/onboarding',{selectedTests:['m1'],difficulty:'d2',practiceFormat:'random'},token)).status,200);return {uid,email,password,token};}
test('registro conserva consentimiento explícito e idioma sin inventarlo en cuentas antiguas',async()=>{
 const a=await account();const p=(await db.collection('users').doc(a.uid).get()).data();assert.equal(p.locale,'en');assert.equal(p.dataConsent.accepted,true);assert.ok(p.dataConsent.acceptedAt.toDate());
 assert.equal((await request('/auth/register',{name:'Prueba',email:`invalid-${randomUUID()}@example.test`,password:'Testing-123',consent:false})).status,400);
});
test('dos clientes ven la misma notificación y el mismo saldo sin doble recompensa diaria',async()=>{
 const a=await account();const login=await request('/auth/login',{email:a.email,password:a.password});assert.equal(login.status,200);assert.equal(login.data.dailyLoginReward,null);
 const mobile=await request('/notifications',null,a.token),web=await request('/notifications',null,login.data.tokens.accessToken);assert.equal(mobile.data.unread,1);assert.deepEqual(mobile.data,web.data);
 assert.equal((await request(`/notifications/${mobile.data.items[0].id}/read`,{},a.token,'PATCH')).status,200);assert.equal((await request('/notifications',null,login.data.tokens.accessToken)).data.unread,0);
 const medals=await request('/medals',null,a.token);assert.equal(medals.data.medals.bronze,1);assert.equal(medals.data.history.length,1);
 const other=await account();assert.equal((await request(`/notifications/${mobile.data.items[0].id}/read`,{},other.token,'PATCH')).status,404);
});
test('plan guardado desde un cliente se recupera igual desde otra sesión y respeta validación',async()=>{
 const a=await account();const data={dailyGoal:7,testIds:['m1','m2']};assert.equal((await request('/study-plan',data,a.token,'PUT')).status,200);
 const login=await request('/auth/login',{email:a.email,password:a.password});const plan=await request('/study-plan',null,login.data.tokens.accessToken);assert.deepEqual(plan.data.settings,data);assert.equal(plan.data.saved,true);
 assert.equal((await request('/study-plan',{dailyGoal:21,testIds:['m1']},a.token,'PUT')).status,400);
 assert.equal((await request('/study-plan')).status,401);
});
test('el plan simulado vigente amplía grupos y al volver a gratis conserva los grupos existentes',async()=>{
 const a=await account();assert.equal((await request('/plans/subscribe',{planId:'all',requestId:randomUUID()},a.token)).status,200);
 for(let i=0;i<2;i++){const g=await request('/groups',{name:'Grupo prueba',subjectTestId:'m1',visibility:'public',requestId:randomUUID()},a.token);assert.equal(g.status,201,JSON.stringify(g));refs.push(db.collection('groups').doc(g.data.id));}
 assert.equal((await request('/groups',null,a.token)).meta.groupLimit,0);
 assert.equal((await request('/plans/subscribe',{planId:'free',requestId:randomUUID()},a.token)).status,200);assert.equal((await request('/groups',null,a.token)).data.length,2);
 assert.equal((await request('/groups',{name:'No duplicar',subjectTestId:'m1',requestId:randomUUID()},a.token)).status,409);
});
test('cursores permiten ver publicaciones y comentarios anteriores a los primeros veinte',async()=>{
 const a=await account();const g=db.collection('groups').doc(randomUUID());refs.push(g);await g.set({memberIds:[a.uid],ownerId:a.uid});const batch=db.batch();const posts=[];
 for(let i=0;i<23;i++){const p=db.collection('posts').doc(randomUUID());refs.push(p);posts.push(p);batch.set(p,{authorUid:a.uid,author:{name:'Fixture'},text:'Prueba',visibility:'group',groupId:g.id,createdAt:new Date(1700000000000+i),likeCount:0,commentCount:0});}
 for(let i=0;i<23;i++)batch.set(posts[0].collection('comments').doc(randomUUID()),{authorUid:a.uid,author:{name:'Fixture'},text:'Comentario',createdAt:new Date(1700000000000+i)});await batch.commit();
 for(const path of [`/posts?groupId=${g.id}`,`/posts/${posts[0].id}/comments`]){const first=await request(path,null,a.token);assert.equal(first.data.length,20);assert.ok(first.meta.nextCursor);const next=await request(path+(path.includes('?')?'&':'?')+'cursor='+encodeURIComponent(first.meta.nextCursor),null,a.token);assert.equal(next.data.length,3);assert.equal(new Set([...first.data,...next.data].map(x=>x.id)).size,23);}
});
