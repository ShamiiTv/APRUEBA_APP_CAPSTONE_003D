import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const project = process.env.ACCOUNT_DELETION_TEST_PROJECT_ID;
if (!project?.startsWith('demo-')) throw new Error('Usar un proyecto demo- aislado; nunca producción');
process.env.FIREBASE_PROJECT_ID = project;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.JWT_SECRET = 'isolated-deletion-access-secret';
process.env.JWT_REFRESH_SECRET = 'isolated-deletion-refresh-secret';
const { db, auth } = await import('../src/config/firebase.js');
const { leaveGroupsOnDelete, removeUserReactions } = await import('../src/services/accountDeletion.js');
const refs=[];
after(async()=>{for(const ref of refs)await db.recursiveDelete(ref);});
function group(){const ref=db.collection('groups').doc(randomUUID());refs.push(ref);return ref;}

test('eliminar dueño conserva al integrante añadido después de enumerar grupos',async()=>{
  const uid=randomUUID(), other=randomUUID(), newcomer=randomUUID(),ref=group();
  await ref.set({memberIds:[uid,other],memberCount:2,ownerId:uid});
  await ref.collection('members').doc(uid).set({role:'owner'});
  let injected=false;
  const database={collection:db.collection.bind(db),runTransaction:async callback=>{
    if(!injected){injected=true;await ref.update({memberIds:[uid,other,newcomer],memberCount:3});}
    return db.runTransaction(callback);
  }};
  await leaveGroupsOnDelete(uid,database);
  assert.ok(injected);
  const data=(await ref.get()).data();
  assert.deepEqual(data.memberIds,[other,newcomer]);assert.equal(data.memberCount,2);
  assert.equal(data.ownerId,other);assert.equal(data.archived,false);
  assert.equal((await ref.collection('members').doc(uid).get()).exists,false);
  assert.equal((await ref.collection('members').doc(other).get()).data().role,'owner');
});
test('archiva grupo vacío y repetir la limpieza no altera a otros',async()=>{
  const uid=randomUUID(),ref=group();await ref.set({memberIds:[uid],memberCount:1,ownerId:uid});
  await leaveGroupsOnDelete(uid);await leaveGroupsOnDelete(uid);
  const data=(await ref.get()).data();assert.deepEqual(data.memberIds,[]);
  assert.equal(data.archived,true);assert.equal(data.ownerId,null);assert.equal(data.memberCount,0);
});
test('retira reacciones históricas en varias páginas sin borrar publicaciones ni otras reacciones',async()=>{
  const uid=randomUUID(),other=randomUUID(),prefix=randomUUID();
  const batch=db.batch();
  for(let i=0;i<103;i++){
    const ref=db.collection('posts').doc(`${prefix}-${String(i).padStart(3,'0')}`);refs.push(ref);
    batch.set(ref,{text:'Contenido de otro usuario',authorUid:other,likeCount:2});
    batch.set(ref.collection('likes').doc(uid),{createdAt:new Date()});
    batch.set(ref.collection('likes').doc(other),{createdAt:new Date()});
  }
  await batch.commit();await removeUserReactions(uid);await removeUserReactions(uid);
  for(const ref of refs.filter(r=>r.parent.id==='posts')){
    assert.equal((await ref.get()).data().likeCount,1);
    assert.equal((await ref.get()).data().text,'Contenido de otro usuario');
    assert.equal((await ref.collection('likes').doc(uid).get()).exists,false);
    assert.equal((await ref.collection('likes').doc(other).get()).exists,true);
  }
});
test('si el usuario retira una reacción mientras se elimina su cuenta no descuenta a otro',async()=>{
  const uid=randomUUID(),other=randomUUID(),ref=db.collection('posts').doc(randomUUID());refs.push(ref);
  await ref.set({likeCount:2});await ref.collection('likes').doc(uid).set({});await ref.collection('likes').doc(other).set({});
  let injected=false;
  const database={collection:db.collection.bind(db),getAll:db.getAll.bind(db),runTransaction:async callback=>{
    if(!injected){injected=true;await ref.collection('likes').doc(uid).delete();await ref.update({likeCount:1});}
    return db.runTransaction(callback);
  }};
  await removeUserReactions(uid,database);assert.ok(injected);
  assert.equal((await ref.get()).data().likeCount,1);
  assert.equal((await ref.collection('likes').doc(other).get()).exists,true);
});


test('endpoint elimina perfil, datos y reacciones y permite registrar el mismo correo',async()=>{
  const {default:express}=await import('express');
  const {deleteAccount,register}=await import('../src/controllers/authController.js');
  const {responseHandler}=await import('../src/middleware/responseHandler.js');
  const uid=randomUUID(),other=randomUUID(),email=`delete-${randomUUID()}@example.test`,password='Isolated-password-123';
  const user=db.collection('users').doc(uid),post=db.collection('posts').doc(randomUUID());
  const ticket=db.collection('supportTickets').doc(randomUUID()),correction=db.collection('corrections').doc(randomUUID());
  refs.push(user,post,ticket,correction);
  await auth.createUser({uid,email,password});
  await user.set({email,emailLower:email,name:'Fixture',plan:'free'});
  await user.collection('answeredQuestions').doc('fixture').set({isCorrect:true});
  await user.collection('medalLedger').doc('fixture').set({amount:1});
  await user.collection('notifications').doc('fixture').set({read:false});
  await post.set({authorUid:other,likeCount:2,text:'Se conserva'});
  await post.collection('likes').doc(uid).set({});await post.collection('likes').doc(other).set({});
  await ticket.set({userId:uid});await ticket.collection('messages').doc('fixture').set({body:'Prueba'});
  await correction.set({userId:uid});
  const ownPost=db.collection('posts').doc(randomUUID());refs.push(ownPost);
  await ownPost.set({authorUid:uid,author:{name:'Fixture'},text:'Contenido privado que debe desaparecer',question:{statement:'Pregunta propia'}});
  await ownPost.collection('comments').doc('other').set({authorUid:other,author:{name:'Other'},text:'Respuesta de otra persona'});
  await post.collection('comments').doc('own').set({authorUid:uid,author:{name:'Fixture'},text:'Comentario propio'});
  const app=express();app.use(express.json(),responseHandler);
  app.delete('/me',(req,res,next)=>{req.user={sub:uid};next();},deleteAccount);
  app.post('/register',register);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  let recreated;
  try{
    const bad=await fetch(base+'/me',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:'incorrect-password'})});
    assert.ok([400,401].includes(bad.status));assert.equal((await user.get()).exists,true);
    const good=await fetch(base+'/me',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:password})});
    assert.equal(good.status,200,await good.text());
    await assert.rejects(auth.getUser(uid),e=>e.code==='auth/user-not-found');
    assert.equal((await user.get()).exists,false);assert.equal((await user.listCollections()).length,0);
    assert.equal((await ticket.get()).exists,false);assert.equal((await ticket.listCollections()).length,0);
    assert.equal((await correction.get()).exists,false);
    const removed=(await ownPost.get()).data();assert.equal(removed.text,'');assert.equal(removed.question,null);assert.equal(removed.authorUid,null);assert.equal(removed.contentDeleted,true);
    assert.equal((await ownPost.collection('comments').doc('other').get()).data().text,'Respuesta de otra persona');
    const removedComment=(await post.collection('comments').doc('own').get()).data();assert.equal(removedComment.text,'');assert.equal(removedComment.contentDeleted,true);
    assert.equal((await post.get()).data().text,'Se conserva');assert.equal((await post.get()).data().likeCount,1);
    assert.equal((await post.collection('likes').doc(other).get()).exists,true);
    assert.equal((await post.collection('likes').doc(uid).get()).exists,false);
    const reg=await fetch(base+'/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Nuevo registro',email,password})});
    const data=await reg.json();assert.equal(reg.status,201,JSON.stringify(data));recreated=data.data.user.uid;
    assert.notEqual(recreated,uid);
  }finally{
    await auth.deleteUser(uid).catch(()=>{});
    if(recreated){await db.recursiveDelete(db.collection('users').doc(recreated));await auth.deleteUser(recreated);}
    await new Promise(r=>server.close(r));
  }
});
