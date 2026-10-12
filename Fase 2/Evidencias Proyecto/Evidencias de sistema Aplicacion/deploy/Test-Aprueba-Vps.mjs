// Run on the VPS as root. Reports contain no passwords, tokens or user data.
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
for(const line of fs.readFileSync('/etc/shamii/aprueba.env','utf8').split('\n')){
 const m=/^([A-Z_]+)=(.*)$/.exec(line); if(m)process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'');
}
const base='/opt/shamii/aprueba/api/';
const {db,auth}=await import(pathToFileURL(base+'src/config/firebase.js'));
const {applicationDefault}=await import(pathToFileURL(base+'node_modules/firebase-admin/lib/esm/app/index.js'));
const bearer=(await applicationDefault().getAccessToken()).access_token;
const project='projects/aprueba-app-9d317';
async function google(url,method='GET',body){
 const res=await fetch(url,{method,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 return {status:res.status,data:await res.json()};
}
const report=[];
function record(name,pass,detail=''){report.push({name,pass,detail});console.log((pass?'PASS':'FAIL')+' '+name+(detail?' — '+detail:''));}
if(process.argv.includes('--configure')){
 const root='https://firebaserules.googleapis.com/v1/'+project;
 const releaseName=project+'/releases/cloud.firestore';
 const old=await google(root+'/releases/cloud.firestore');
 if(old.status===200){fs.writeFileSync('/opt/shamii/aprueba-backups/firestore-release-before-test-'+Date.now()+'.json',JSON.stringify(old.data),{mode:0o600});}
 const rules=await google(root+'/rulesets','POST',{source:{files:[{name:'firestore.rules',content:fs.readFileSync('/opt/shamii/aprueba/database/firestore.rules','utf8')}]}});
 if(rules.status===200){
  const body={name:releaseName,rulesetName:rules.data.name};
  const activated=old.status===404?await google(root+'/releases','POST',body):await google(root+'/releases/cloud.firestore','PATCH',{release:body,updateMask:'rulesetName'});
  record('Reglas de Firestore desplegadas',activated.status===200,'HTTP '+activated.status);
 }else record('Reglas de Firestore desplegadas',false,'HTTP '+rules.status+' '+rules.data.error?.status);
 const indexes=JSON.parse(fs.readFileSync('/opt/shamii/aprueba/database/firestore.indexes.json','utf8')).indexes;
 for(const index of indexes){
  const result=await google('https://firestore.googleapis.com/v1/'+project+'/databases/(default)/collectionGroups/'+index.collectionGroup+'/indexes','POST',{queryScope:index.queryScope,fields:index.fields.map(f=>f.arrayConfig?{fieldPath:f.fieldPath,arrayConfig:f.arrayConfig}:f)});
  record('Índice '+index.collectionGroup+': '+index.fields.map(f=>f.fieldPath).join(','),[200,409].includes(result.status),'HTTP '+result.status);
 }
}
const api='http://127.0.0.1:8081/api/v1';
// Independent simulated client for the auth limiter; public UI is tested separately through HTTPS.
const authClientIp='203.0.113.'+(1+Math.floor(Math.random()*253));
async function request(path,token,body,method){
 const authentication=path.startsWith('/auth/');
 const res=await fetch((authentication?'http://127.0.0.1:4000/api/v1':api)+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',...(authentication?{'X-Forwarded-For':authClientIp}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 let json;try{json=await res.json();}catch{json={};}
 return {status:res.status,...json};
}
const accounts=[],groups=[],posts=[];
try{
 record('Inicio web', (await fetch('http://127.0.0.1:8081/')).status===200);
 for(const path of ['/progress','/practice/next','/groups','/posts','/medals','/study-plan'])record('Acceso anónimo bloqueado '+path,(await request(path)).status===401);
 const email='qa-'+randomUUID()+'@example.com',password=randomUUID()+'aA1!';
 const registration=await request('/auth/register',null,{name:'Prueba técnica temporal',email,password});
 record('Registro real',registration.status===201,'HTTP '+registration.status);
 if(registration.status!==201)throw new Error('Registro no disponible');
 const uid=registration.data.user.uid;accounts.push(uid);
 let token=registration.data.tokens.accessToken;
 record('Onboarding requerido',(await request('/progress',token)).status===403);
 record('Onboarding', (await request('/auth/onboarding',token,{selectedTests:['m1','m2','lectora','cien'],difficulty:'d2'})).status===200);
 const login=await request('/auth/login',null,{email,password});
 record('Login real',login.status===200,'HTTP '+login.status);
 if(login.status===200)token=login.data.tokens.accessToken;
 record('Contraseña incorrecta rechazada',(await request('/auth/login',null,{email,password:randomUUID()})).status===401);
 record('Refresco de sesión',(await request('/auth/refresh',null,{refreshToken:registration.data.tokens.refreshToken})).status===200);
 record('Perfil editable',(await request('/auth/me',token,{name:'Prueba técnica temporal actualizada'},'PATCH')).status===200);
 record('Escalada de privilegios rechazada',(await request('/auth/me',token,{role:'admin',plan:'all',medals:{platinum:99}},'PATCH')).status===400);
 for(const path of ['/progress','/study-plan','/medals','/medals/benefits','/groups','/posts','/plans','/skills','/tutors']){
  const result=await request(path,token);record('Lectura '+path,result.status===200,'HTTP '+result.status);
 }
 record('Guardar plan de estudio',(await request('/study-plan',token,{dailyGoal:5,testIds:['m1']},'PUT')).status===200);
 let question;
 for(const testId of ['m1','m2','lectora','cien']){
  const next=await request('/practice/next?testId='+testId+'&difficulty=d2',token);
  record('Pregunta disponible '+testId,next.status===200&&!!next.data?.question,'HTTP '+next.status);
  if(next.data?.question){record('Respuesta oculta '+testId,!('correctAnswer' in next.data.question)&&!('explanation' in next.data.question));if(testId==='m1')question=next.data.question;}
 }
 if(question){
  const body={questionId:question.id,selectedOption:question.options[0].id,elapsedMs:1000};
  const answered=await request('/practice/answers',token,body);record('Responder práctica',answered.status===200,'HTTP '+answered.status);
  const again=await request('/practice/answers',token,body);record('Respuesta repetida idempotente',again.status===200&&again.data?.alreadyAnswered===true);
  const profile=await request('/auth/me',token);record('Cuota consumida una vez',profile.data?.quota?.used===1);
 }
 const g=await request('/groups',token,{name:'Grupo QA temporal',subjectTestId:'m1',requestId:randomUUID()});
 record('Crear grupo',g.status===201);
 if(g.data?.id){groups.push(g.data.id);record('Detalle de grupo',(await request('/groups/'+g.data.id,token)).status===200);}
 const p=await request('/posts',token,{text:'Publicación QA temporal',requestId:randomUUID(),...(groups[0]?{groupId:groups[0]}:{})});
 record('Compartir al grupo',p.status===201);
 if(p.data?.id){posts.push(p.data.id);record('Comentarios',(await request('/posts/'+p.data.id+'/comments',token,{text:'Comentario QA temporal',requestId:randomUUID()})).status===200);record('Me gusta',(await request('/posts/'+p.data.id+'/like',token,{liked:true})).status===200);}
 if(groups[0])record('Feed privado',(await request('/posts?groupId='+groups[0],token)).status===200);
 const list=await db.collection('questions').where('status','==','published').limit(1).get();
 const url='https://firestore.googleapis.com/v1/'+project+'/databases/(default)/documents/questions/'+list.docs[0].id+'?key='+process.env.FIREBASE_WEB_API_KEY;
 record('Firestore no expone respuestas a visitantes',(await fetch(url)).status===403);
 await auth.revokeRefreshTokens(uid);
 record('Sesión revocada rechazada',(await request('/auth/me',token)).status===401);
}catch(error){record('Recorrido completo',false,error.message);}finally{
 for(const id of posts)await db.recursiveDelete(db.collection('posts').doc(id));
 for(const id of groups)await db.recursiveDelete(db.collection('groups').doc(id));
 for(const uid of accounts){await db.recursiveDelete(db.collection('users').doc(uid));await auth.deleteUser(uid);}
 console.log('Cuentas, grupos y publicaciones temporales eliminados.');
 fs.writeFileSync('/opt/shamii/aprueba-backups/qa-latest.json',JSON.stringify({date:new Date().toISOString(),report},null,2),{mode:0o600});
}
console.log(JSON.stringify({passed:report.filter(r=>r.pass).length,failed:report.filter(r=>!r.pass).length}));
process.exit(report.some(r=>!r.pass)?1:0);
