import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';

const project = process.env.SOCIAL_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw new Error('SOCIAL_TEST_PROJECT_ID debe ser un proyecto demo- aislado');
process.env.FIREBASE_PROJECT_ID = project;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const { db } = await import('../src/config/firebase.js');
const groups = await import('../src/controllers/groupsController.js');
const posts = await import('../src/controllers/postsController.js');
const { contentId } = await import('../src/services/questionBank.js');
const app = express();
app.use(express.json());
app.use((req,res,next) => { req.user = { sub: req.headers['x-user'] }; next(); });
app.get('/groups',groups.getMyGroups);app.post('/groups',groups.createGroup);app.post('/join',groups.joinGroup);
app.get('/groups/:id',groups.getGroup);app.post('/groups/:id/leave',groups.leaveGroup);
app.get('/posts',posts.getPosts);app.post('/posts',posts.createPost);app.post('/posts/:id/like',posts.toggleLike);
app.get('/posts/:id/comments',posts.getComments);app.post('/posts/:id/comments',posts.addComment);
const server = app.listen(0,'127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const userIds=[], groupIds=new Set(), postIds=new Set(), questionIds=[];
after(async () => {
  for(const id of postIds) await db.recursiveDelete(db.collection('posts').doc(id));
  for(const id of groupIds) await db.recursiveDelete(db.collection('groups').doc(id));
  for(const id of userIds) await db.recursiveDelete(db.collection('users').doc(id));
  for(const id of questionIds) await db.collection('questions').doc(id).delete();
  await new Promise(resolve => server.close(resolve));
});
async function user(plan='all') {
  const id=randomUUID();userIds.push(id);
  await db.collection('users').doc(id).set({ name:'Nombre fixture',email:'private@example.test',school:'Colegio privado',plan,planStatus:plan==='free'?'none':'active' });
  return id;
}
async function request(uid,path,body) {
  const res=await fetch(base+path,{method:body ? 'POST':'GET',headers:{'Content-Type':'application/json','x-user':uid},...(body?{body:JSON.stringify(body)}:{})});
  const result={status:res.status,...await res.json()};
  if(path==='/groups' && body && result.data?.id) groupIds.add(result.data.id);
  if(path==='/posts' && body && result.data?.id) postIds.add(result.data.id);
  return result;
}
const create = (uid,name='Grupo fixture',id=randomUUID()) => request(uid,'/groups',{name,subjectTestId:'m1',requestId:id});
async function question(overrides={}) {
  const id=randomUUID();questionIds.push(id);
  const q={testId:'m1',statement:'¿Cuánto es 1 + 1?',options:['1','2','3','4'],correctAnswer:'B',explanation:{steps:['Secreto de solución']},bankVersion:2,status:'published',...overrides};
  q.contentId=contentId(q);await db.collection('questions').doc(id).set(q);return {id,...q};
}

test('creating a group is atomic and concurrent retries cannot duplicate it',async()=>{
  const uid=await user(),rid=randomUUID();
  const results=await Promise.all(Array.from({length:4},()=>create(uid,'Grupo único',rid)));
  assert.ok(results.every(result=>[200,201].includes(result.status)),JSON.stringify(results));
  assert.equal(new Set(results.map(result=>result.data.id)).size,1);
  const ref=db.collection('groups').doc(results[0].data.id);
  assert.equal((await ref.collection('members').get()).size,1);
  assert.equal((await ref.get()).data().memberCount,1);
  assert.equal((await create(uid,'Nombre diferente',rid)).status,409);
});
test('free-plan concurrency checks both creation and joining under one limit',async()=>{
  const owner=await user(),destination=(await create(owner)).data.id,uid=await user('free');
  const results=await Promise.all([create(uid),request(uid,'/join',{groupId:destination})]);
  assert.equal(results.filter(result=>[200,201].includes(result.status)).length,1,JSON.stringify(results));
  assert.equal(results.filter(result=>result.status===409).length,1);
  const mine=await request(uid,'/groups');assert.equal(mine.data.length,1);assert.equal(mine.meta.groupLimit,1);
  assert.equal((await request(uid,'/join',{groupId:mine.data[0].id})).data.alreadyMember,true);
});
test('leaving transfers ownership, frees capacity and closes the last-member group',async()=>{
  const owner=await user(),member=await user('free'),id=(await create(owner)).data.id;
  assert.equal((await request(member,'/join',{groupId:id})).status,200);
  await request(owner,`/groups/${id}/leave`,{});
  const group=(await db.collection('groups').doc(id).get()).data();assert.equal(group.ownerId,member);assert.equal(group.memberCount,1);
  assert.equal((await request(owner,`/groups/${id}`)).status,403);
  await request(member,`/groups/${id}/leave`,{});
  assert.equal((await request(owner,'/join',{groupId:id})).status,404);
  assert.equal((await create(member)).status,201);
});
test('group statistics deduplicate first attempts and never reveal account data',async()=>{
  const owner=await user(),member=await user(),empty=await user(),id=(await create(owner)).data.id,q=await question();
  await request(member,'/join',{groupId:id});await request(empty,'/join',{groupId:id});
  const history=db.collection('users').doc(owner).collection('answeredQuestions');
  await history.doc('first').set({questionId:q.id,contentId:q.contentId,testId:'m1',isCorrect:true,answeredAt:new Date('2026-01-01')});
  await history.doc('duplicate').set({questionId:q.id,contentId:q.contentId,testId:'m1',isCorrect:false,answeredAt:new Date('2026-02-01')});
  await db.collection('users').doc(member).collection('answeredQuestions').doc('attempt').set({questionId:q.id,contentId:q.contentId,testId:'m1',isCorrect:false,answeredAt:new Date()});
  const result=await request(owner,`/groups/${id}`);assert.equal(result.status,200);
  assert.equal(result.data.statistics.answered,2);assert.equal(result.data.statistics.accuracy,50);assert.equal(result.data.statistics.myAccuracy,100);
  assert.equal(result.data.members.find(row=>row.uid===empty).accuracy,null);
  assert.ok(!JSON.stringify(result).includes('private@example.test'));assert.ok(!JSON.stringify(result).includes('Colegio privado'));
  const outsider=await user();assert.equal((await request(outsider,`/groups/${id}`)).status,403);
});
test('public posts retry once and share only server-approved question content',async()=>{
  const uid=await user(),q=await question(),rid=randomUUID();
  const body={text:'Una duda',questionId:q.id,requestId:rid};
  const results=await Promise.all([request(uid,'/posts',body),request(uid,'/posts',body)]);
  assert.ok(results.every(result=>[200,201].includes(result.status)),JSON.stringify(results));
  assert.equal(results[0].data.id,results[1].data.id);assert.equal(results[0].data.author.name,'Nombre fixture');
  assert.equal(results[0].data.question.correctAnswer,undefined);assert.equal(results[0].data.question.explanation,undefined);
  assert.equal((await request(uid,'/posts',{...body,text:'Cambio de contenido'})).status,409);
  const pending=await question({status:'pending_review'});
  assert.equal((await request(uid,'/posts',{text:'Duda',questionId:pending.id,requestId:randomUUID()})).status,409);
  assert.equal((await request(uid,'/posts',{text:'Duda',question:{correctAnswer:'C'},requestId:randomUUID()})).status,400);
});
test('private group posts stay inaccessible to outsiders across every endpoint',async()=>{
  const owner=await user(),outsider=await user(),group=(await create(owner)).data.id,q=await question();
  const created=await request(owner,'/posts',{text:'Duda privada',groupId:group,questionId:q.id,requestId:randomUUID()});
  const id=created.data.id;
  assert.equal((await request(outsider,`/posts?groupId=${group}`)).status,403);
  assert.equal((await request(outsider,`/posts/${id}/comments`)).status,403);
  assert.equal((await request(outsider,`/posts/${id}/comments`,{text:'Intrusión',requestId:randomUUID()})).status,403);
  assert.equal((await request(outsider,`/posts/${id}/like`,{liked:true})).status,403);
  assert.equal((await request(outsider,'/posts',{text:'Intrusión',groupId:group,requestId:randomUUID()})).status,403);
  assert.ok(!(await request(owner,'/posts')).data.some(post=>post.id===id));
  assert.ok((await request(owner,`/posts?groupId=${group}`)).data.some(post=>post.id===id));
  const wrong=await question({testId:'m2'});
  assert.equal((await request(owner,'/posts',{text:'Materia equivocada',questionId:wrong.id,groupId:group,requestId:randomUUID()})).status,400);
});
test('reaction desired state is safe to repeat and concurrent users preserve counts',async()=>{
  const uid=await user(),other=await user(),post=(await request(uid,'/posts',{text:'Me gusta',requestId:randomUUID()})).data.id;
  const results=await Promise.all([request(uid,`/posts/${post}/like`,{liked:true}),request(uid,`/posts/${post}/like`,{liked:true}),request(other,`/posts/${post}/like`,{liked:true})]);
  assert.ok(results.every(result=>result.status===200),JSON.stringify(results));
  assert.equal((await db.collection('posts').doc(post).get()).data().likeCount,2);
  await Promise.all([request(uid,`/posts/${post}/like`,{liked:false}),request(uid,`/posts/${post}/like`,{liked:false})]);
  assert.equal((await db.collection('posts').doc(post).get()).data().likeCount,1);
  assert.equal((await request(uid,`/posts/${post}/like`,{})).status,400);
});
test('comments retry without inflating counts and changed retries are rejected',async()=>{
  const uid=await user(),post=(await request(uid,'/posts',{text:'Comentarios',requestId:randomUUID()})).data.id,body={text:'Respuesta',requestId:randomUUID()};
  const results=await Promise.all(Array.from({length:3},()=>request(uid,`/posts/${post}/comments`,body)));
  assert.ok(results.every(result=>result.status===200),JSON.stringify(results));
  assert.equal(new Set(results.map(result=>result.data.id)).size,1);assert.ok(results.every(result=>result.meta.commentCount===1));
  assert.equal((await request(uid,`/posts/${post}/comments`,{...body,text:'Cambio'})).status,409);
  assert.equal((await request(uid,`/posts/${post}/comments`)).data.length,1);
});
test('cursor pagination preserves ties and exposes all posts and comments',async()=>{
  const uid=await user(),stamp=new Timestamp(1700000000,123456789);
  const batch=db.batch();
  const ids=Array.from({length:43},()=>randomUUID());
  for(const id of ids){postIds.add(id);batch.set(db.collection('posts').doc(id),{visibility:'public',text:id,author:{name:'Fixture'},likeCount:0,commentCount:0,createdAt:stamp});}
  const post=ids[0];
  for(let index=0;index<43;index++)batch.set(db.collection('posts').doc(post).collection('comments').doc(String(index).padStart(3,'0')),{text:'Comentario '+index,author:{name:'Fixture'},createdAt:stamp});
  await batch.commit();
  let cursor,seen=[];
  do {const result=await request(uid,'/posts'+(cursor?'?cursor='+cursor:''));assert.equal(result.status,200,JSON.stringify(result));seen.push(...result.data.map(row=>row.id));cursor=result.meta.nextCursor;}while(cursor);
  assert.equal(new Set(seen).size,seen.length);assert.ok(ids.every(id=>seen.includes(id)));
  cursor=null;seen=[];
  do {const result=await request(uid,`/posts/${post}/comments`+(cursor?'?cursor='+cursor:''));assert.equal(result.status,200);seen.push(...result.data.map(row=>row.id));cursor=result.meta.nextCursor;}while(cursor);
  assert.equal(seen.length,43);assert.equal(new Set(seen).size,43);
  const bad=Buffer.from(JSON.stringify({scope:'comments:other',seconds:1700000000,nanos:0,id:'000'})).toString('base64url');
  assert.equal((await request(uid,`/posts/${post}/comments?cursor=${bad}`)).status,400);
  assert.equal((await request(uid,'/posts?cursor=invalid')).status,400);
});
test('invalid input is rejected before writing any social data',async()=>{
  const uid=await user();
  for(const body of [{name:42},{name:' ',subjectTestId:'m1'},{name:'a'.repeat(101),subjectTestId:'m1'},{name:'Grupo',subjectTestId:'unknown'},{name:'Grupo',ownerId:'other'}])assert.equal((await request(uid,'/groups',{...body,requestId:randomUUID()})).status,400);
  assert.equal((await request(uid,'/groups')).data.length,0);
  for(const value of [42,' ','a'.repeat(3001)])assert.equal((await request(uid,'/posts',{text:value,requestId:randomUUID()})).status,400);
  assert.equal((await request(uid,'/join',{groupId:'bad/path'})).status,400);
});
