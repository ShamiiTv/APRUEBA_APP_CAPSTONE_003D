import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const project=process.env.SECURITY_TEST_PROJECT_ID;
if(!project?.startsWith('demo-'))throw Error('Security tests require an isolated demo- project');
Object.assign(process.env,{NODE_ENV:'test',FIREBASE_PROJECT_ID:project,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',JWT_SECRET:'isolated-security-access-secret-not-production',JWT_REFRESH_SECRET:'isolated-security-refresh-secret-not-production',PAYMENTS_MODE:'simulation'});
const {db,auth}=await import('../src/config/firebase.js');
const {generateTokens}=await import('../src/middleware/auth.js');
const {createApp}=await import('../src/app.js');
const app=createApp(),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}/api/v1`;
const ids=[randomUUID(),randomUUID()],refs=[];
const password='Security-fixture-only-123';
for(const [index,uid]of ids.entries()){
 await auth.createUser({uid,email:`security-${uid}@example.test`,password,emailVerified:true});
 await db.collection('users').doc(uid).set({name:`Security fixture ${index}`,email:`security-${uid}@example.test`,emailLower:`security-${uid}@example.test`,onboardingCompleted:true,selectedTests:['m1'],plan:'free',medals:{bronze:5},lastLoginDate:'2099-01-01'});
}
const [a,b]=ids,one=generateTokens({id:a}),two=generateTokens({id:a}),other=generateTokens({id:b});
async function request(path,{token=two.accessToken,method='GET',body,headers={}}={}){
 const res=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 return {status:res.status,headers:res.headers,json:await res.json()};
}
after(async()=>{await new Promise(r=>server.close(r));for(const ref of refs)await db.recursiveDelete(ref);for(const uid of ids){await db.recursiveDelete(db.collection('users').doc(uid));await auth.deleteUser(uid).catch(()=>{});}});
test('private API rejects missing, forged and refresh-as-access credentials',async()=>{
 for(const token of [null,'eyJhbGciOiJub25lIn0.eyJzdWIiOiJmb3JnZWQifQ.',one.refreshToken,'not-a-jwt'])assert.equal((await request('/auth/me',{token})).status,401);
});
test('CORS, body size, JSON types and sensitive response cache policy',async()=>{
 assert.equal((await request('/health',{token:null,headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await request('/auth/login',{token:null,method:'POST',body:'{' })).status,400);
 assert.equal((await request('/auth/login',{token:null,method:'POST',body:{padding:'x'.repeat(40000)}})).status,413);
 assert.equal((await request('/auth/login',{token:null,method:'POST',body:'hello',headers:{'Content-Type':'text/plain'}})).status,415);
 assert.equal((await request('/auth/me')).headers.get('cache-control'),'no-store');
});
test('profile rejects privilege and identity injection and never returns stored secrets',async()=>{
 await db.collection('users').doc(a).update({passwordHash:'legacy-sensitive-fixture',refreshToken:'must-not-leak',adminSecret:'must-not-leak'});
 const before=await request('/auth/me');assert.equal(before.status,200);
 for(const key of ['passwordHash','refreshToken','adminSecret'])assert.equal(before.json.data[key],undefined);
 for(const body of [{plan:'all'},{role:'admin'},{uid:b},{medals:{bronze:999999}},{quota:{unlimited:true}},{address:{street:'x',commune:'y',__extra:'forged'}}])assert.equal((await request('/auth/me',{method:'PATCH',body})).status,400);
 assert.equal((await db.collection('users').doc(a).get()).data().plan,'free');
});
let groupId,postId;
test('private group, posts, comments, likes and invitations deny nonmembers',async()=>{
 const created=await request('/groups',{method:'POST',body:{name:'Isolated private security group',visibility:'private',subjectTestId:'m1',requestId:randomUUID()}});
 assert.equal(created.status,201,JSON.stringify(created.json));groupId=created.json.data.id;refs.push(db.collection('groups').doc(groupId));
 const post=await request('/posts',{method:'POST',body:{text:'<img src=x onerror="window.securityProbe=true">',groupId,requestId:randomUUID()}});assert.equal(post.status,201);postId=post.json.data.id;refs.push(db.collection('posts').doc(postId));
 for(const path of [`/groups/${groupId}`,`/posts?groupId=${groupId}`,`/posts/${postId}/comments`])assert.equal((await request(path,{token:other.accessToken})).status,403,path);
 assert.equal((await request(`/posts/${postId}/comments`,{token:other.accessToken,method:'POST',body:{text:'forged',requestId:randomUUID()}})).status,403);
 assert.equal((await request(`/posts/${postId}/like`,{token:other.accessToken,method:'POST',body:{liked:true}})).status,403);
 const join=await request('/groups/join',{token:other.accessToken,method:'POST',body:{groupId}});assert.ok([400,403,404].includes(join.status),JSON.stringify(join));
 const feed=await request(`/posts?groupId=${groupId}`);assert.equal(feed.status,200);assert.ok(feed.json.data[0].text.startsWith('<img'));assert.equal(feed.json.data[0].author.email,undefined);
});
test('notifications and gifts cannot be changed across unrelated accounts',async()=>{
 const ref=db.collection('users').doc(a).collection('notifications').doc('security-fixture');await ref.set({read:false,createdAt:new Date()});
 assert.equal((await request('/me/notifications/security-fixture/read',{token:other.accessToken,method:'PATCH',body:{}})).status,404);
 assert.equal((await ref.get()).data().read,false);
 assert.equal((await request('/medals/gifts',{method:'POST',body:{recipients:[{userId:b,amount:1}],requestId:randomUUID()}})).status,403);
});
test('support and skills validate object injection and malformed identifiers',async()=>{
 for(const body of [{subject:{nested:'attack'},message:'hello'},{subject:'hello',message:['attack']},{subject:'hello',message:'text',priority:'admin'},{subject:'hello',message:'x'.repeat(4001)}])assert.equal((await request('/support/tickets',{method:'POST',body})).status,400);
 assert.equal((await request('/support/corrections',{method:'POST',body:{questionId:'bad/path',reason:'other'}})).status,400);
 assert.equal((await request('/skills?testId[eq]=m1')).status,400);
});
test('browser refresh is HttpOnly, namespaces are distinct, reload and logout revoke only that session',async()=>{
 const login=await request('/auth/login',{token:null,method:'POST',headers:{'X-Aprueba-Client':'browser'},body:{email:`security-${a}@example.test`,password}});
 assert.equal(login.status,200);assert.equal(login.json.data.tokens.refreshToken,undefined);
 const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=Strict/i);assert.match(cookie,/Path=\/api\/v1\/auth/);
 const refresh=await request('/auth/refresh',{token:null,method:'POST',headers:{'X-Aprueba-Client':'browser',Cookie:cookie.split(';')[0]},body:{}});assert.equal(refresh.status,200);assert.equal(refresh.json.data.tokens.refreshToken,undefined);
 const mobile=await request('/auth/login',{token:null,method:'POST',headers:{'X-Aprueba-Client':'mobile-browser'},body:{email:`security-${a}@example.test`,password}});assert.match(mobile.headers.get('set-cookie'),/^aprueba_refresh_mobile=/);
 const wrongNamespace=await request('/auth/refresh',{token:null,method:'POST',headers:{'X-Aprueba-Client':'mobile-browser',Cookie:cookie.split(';')[0]},body:{}});assert.equal(wrongNamespace.status,401);
 const logout=await request('/auth/logout',{token:null,method:'POST',headers:{'X-Aprueba-Client':'browser',Cookie:cookie.split(';')[0]},body:{}});assert.equal(logout.status,200);
 assert.equal((await request('/auth/me',{token:refresh.json.data.tokens.accessToken})).status,401);
 assert.equal((await request('/auth/refresh',{token:null,method:'POST',headers:{'X-Aprueba-Client':'browser',Cookie:cookie.split(';')[0]},body:{}})).status,401);
 assert.equal((await request('/auth/me')).status,200);assert.equal((await request('/auth/me',{token:mobile.json.data.tokens.accessToken})).status,200);
});
test('native bearer logout prevents access and refresh replay without ending another device',async()=>{
 assert.equal((await request('/auth/logout',{token:one.accessToken,method:'POST',body:{refreshToken:one.refreshToken}})).status,200);
 assert.equal((await request('/auth/me',{token:one.accessToken})).status,401);
 assert.equal((await request('/auth/refresh',{token:null,method:'POST',body:{refreshToken:one.refreshToken}})).status,401);
 assert.equal((await request('/auth/me')).status,200);
});
test('incorrect password cannot delete data and disabled account cannot reuse tokens',async()=>{
 assert.equal((await request('/auth/me',{method:'DELETE',body:{currentPassword:'wrong-password'}})).status,401);
 assert.equal((await db.collection('users').doc(a).get()).exists,true);
 await auth.updateUser(b,{disabled:true});assert.equal((await request('/auth/me',{token:other.accessToken})).status,401);
});
