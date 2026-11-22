// Dedicated disposable Firebase emulators only; never use a real project.
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdtempSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
if(process.env.FIREBASE_PROJECT_ID!=='demo-aprueba-arena-ui')throw Error('Isolated emulator only');
Object.assign(process.env,{NODE_ENV:'test',ARENA_ENABLED:'true',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',PAYMENTS_MODE:'paypal-sandbox',PAYPAL_CLIENT_ID:'fixture',PAYPAL_CLIENT_SECRET:'fixture',PAYPAL_PLAN_UNI:'P-UNI',PAYPAL_PLAN_ALL:'P-ALL',JWT_SECRET:'isolated-arena-ui-access-secret',JWT_REFRESH_SECRET:'isolated-arena-ui-refresh-secret'});
const root=fileURLToPath(new URL('../../',import.meta.url)),base=root+'aprueba_api/',out=(process.env.APRUEBA_REVIEW_OUTPUT_DIR||mkdtempSync(join(tmpdir(),'aprueba-arena-review-')))+ '/';
const {db,auth}=await import(pathToFileURL(base+'src/config/firebase.js')),{readBank}=await import(pathToFileURL(base+'src/data/seedData.js')),{ARENA_REVIEWED}=await import(pathToFileURL(base+'src/services/arenaQuestions.js'));
const {practiceDate}=await import(pathToFileURL(base+'src/services/practice.js'));
const bank=readBank(),batch=db.batch();for(const id of ARENA_REVIEWED)batch.set(db.collection('questions').doc(id),bank.get(id));await batch.commit();
const {createApp}=await import(pathToFileURL(base+'src/app.js')),{startArenaWorker}=await import(pathToFileURL(base+'src/services/arena.js'));
const server=createApp().listen(4000,'127.0.0.1');await new Promise(r=>server.once('listening',r));const stop=startArenaWorker();
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5179','--strictPort'],{cwd:root+'aprueba_student_web',stdio:'ignore'});
for(let i=0;i<80;i++){try{if((await fetch('http://localhost:5179')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),users=[],contexts=[],errors=[],report={screens:[],checks:[],responses:[]};
async function contrast(page){return page.locator('main').evaluate(root=>{
 const rgb=value=>value.match(/[\d.]+/g)?.map(Number), luminance=arr=>arr.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
 const findings=[];
 for(const el of root.querySelectorAll('*')){
  if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||el.closest('[aria-hidden=true],button:disabled,details:not([open])>p'))continue;
  const rect=el.getBoundingClientRect(),style=getComputedStyle(el);if(!rect.width||!rect.height||Number(style.opacity)<1)continue;
  let bg=null,gradient=false;for(let parent=el;parent;parent=parent.parentElement){const ps=getComputedStyle(parent);if(ps.backgroundImage!=='none'){gradient=true;break;}const color=rgb(ps.backgroundColor);if(color&&color.length===3){bg=color;break;}if(color&&color[3]===1){bg=color;break;}if(color&&color[3]>0){gradient=true;break;}}
  const fg=rgb(style.color);if(!bg||gradient||!fg||fg[3]===0)continue;
  const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(style.fontSize),large=size>=24||(size>=18.66&&Number(style.fontWeight)>=700),minimum=large?3:4.5;
  if(ratio+.02<minimum)findings.push({text:el.textContent.trim().slice(0,70),ratio:Math.round(ratio*100)/100,fg:style.color,bg:bg.slice(0,3),size});
 }
 return findings;
});}
try{
 for(let i=0;i<2;i++){
  const uid='arena-ui-'+randomUUID(),email=uid+'@example.test',password='Arena-isolated-test-123';users.push(uid);await auth.createUser({uid,email,password,emailVerified:true});await db.collection('users').doc(uid).set({name:'Fixture Arena',email,onboardingCompleted:true,lastLoginDate:practiceDate(),plan:'free',selectedTests:['m1'],locale:i?'en':'es',theme:i?'dark':'light',medals:{bronze:10},quota:{date:'unchanged',used:7},createdAt:new Date()});
  const context=await browser.newContext({viewport:{width:i?390:1440,height:1000}});contexts.push(context);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',async r=>{if(r.url().includes('/arena')&&r.status()>=400){let body;try{body=await r.json();}catch{}report.responses.push({status:r.status(),path:new URL(r.url()).pathname,error:body?.error});}});await p.goto('http://localhost:5179/login');await p.locator('#login-email').fill(email);await p.locator('#login-password').fill(password);await p.locator('button[type=submit]').click();await p.waitForURL('http://localhost:5179/');await p.goto('http://localhost:5179/arena');await p.locator('.arena-lobby').waitFor();
  const findings=await contrast(p),overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.screens.push({locale:i?'en':'es',dark:!!i,width:i?390:1440,contrast:findings,overflow});assert.equal(overflow,false);assert.deepEqual(findings,[]);await p.screenshot({path:out+`arena-lobby-${i?'en-dark-mobile':'es-light'}.png`,fullPage:true});
  await db.collection('users').doc(uid).update({theme:i?'light':'dark'});await p.setViewportSize({width:i?1440:390,height:1000});await p.reload();await p.locator('.arena-lobby').waitFor();const otherContrast=await contrast(p);report.screens.push({locale:i?'en':'es',dark:!i,width:i?1440:390,contrast:otherContrast,overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});assert.deepEqual(otherContrast,[]);await p.screenshot({path:out+`arena-lobby-${i?'en-light':'es-dark-mobile'}.png`,fullPage:true});await db.collection('users').doc(uid).update({theme:i?'dark':'light'});await p.setViewportSize({width:i?390:1440,height:1000});await p.reload();await p.locator('.arena-lobby').waitFor();
 }
 const pages=contexts.map(c=>c.pages()[0]),[a,b]=pages;
 const unauth=await fetch('http://localhost:4000/api/v1/arena');assert.equal(unauth.status,401);report.checks.push('unauthenticated access rejected');
 await a.locator('.arena-lobby .arena-primary').click();await a.getByRole('heading',{name:/Buscando rival|Finding an opponent/}).waitFor();await b.locator('.arena-lobby .arena-primary').click();for(const p of pages)await p.getByRole('heading',{name:/Rival encontrado|Opponent found/}).waitFor({timeout:12000});
 const seat=(await db.collection('arenaSeats').doc(users[0]).get()).data(),id=seat.matchId;assert.ok(id);assert.equal((await db.collection('users').doc(users[0]).get()).data().medals.bronze,10);report.checks.push('live matchmaking event, no entry charged in ready state');
 for(const p of pages)await p.getByRole('button',{name:/Estoy listo|I’m ready/}).click();
 for(let round=0;round<5;round++){
  for(const p of pages)await p.locator('.arena-question h3').waitFor({timeout:12000});
  let m=(await db.collection('arenaMatches').doc(id).get()).data();const q=m.questions[round];assert.equal(m.round,round);
  for(const p of pages)await p.getByRole('heading',{name:q.statement,exact:true}).waitFor({timeout:12000});
  const correct=q.options.findIndex(o=>o.id===q.correctAnswer),wrong=(correct+1)%q.options.length;
  for(let i=0;i<2;i++){await pages[i].locator('.arena-options button').nth(i?wrong:correct).click();const response=pages[i].waitForResponse(r=>r.url().endsWith('/answer')&&r.request().method()==='POST');await pages[i].locator('.arena-question>.arena-primary').click();const ack=await response;assert.equal(ack.status(),200,JSON.stringify(await ack.json()));}
  if(round<4)for(const p of pages)await p.waitForFunction(previous=>!document.querySelector('.arena-question h3')||document.querySelector('.arena-question h3').textContent!==previous,q.statement,{timeout:12000});
 }
 for(const p of pages)await p.locator('.arena-result').waitFor({timeout:12000});
 const finished=(await db.collection('arenaMatches').doc(id).get()).data();assert.equal(finished.phase,'finished');assert.deepEqual(finished.scores,[5,0]);assert.equal(finished.escrow,0);
 assert.equal((await db.collection('users').doc(users[0]).get()).data().medals.bronze,11);assert.equal((await db.collection('users').doc(users[1]).get()).data().medals.bronze,9);report.checks.push('five rounds played through both browsers, pot settled exactly once');
 for(let i=0;i<2;i++){await pages[i].locator('.arena-result details').evaluate(e=>e.open=true);await pages[i].screenshot({path:out+`arena-result-${i?'en-dark-mobile':'es-light'}.png`,fullPage:true});assert.equal(await pages[i].locator('.arena-review').count(),5);await pages[i].getByRole('button',{name:/Volver a Arena|Back to Arena/}).click();await pages[i].locator('.arena-lobby').waitFor();await pages[i].waitForTimeout(5500);assert.equal(await pages[i].locator('.arena-result').count(),0);}
 report.checks.push('localized review of five answers, dismissed result stays dismissed');
 for(const p of pages){await p.locator('.arena-test-list button').nth(1).click();await p.locator('.arena-lobby .arena-primary').click();}
 for(const p of pages)await p.getByRole('heading',{name:/Rival encontrado|Opponent found/}).waitFor({timeout:12000});
 for(const p of pages)await p.getByRole('button',{name:/Estoy listo|I’m ready/}).click();await a.getByRole('button',{name:'Abandonar duelo',exact:true}).waitFor();
 await a.getByRole('link',{name:'Inicio',exact:true}).click();await a.locator('dialog[open]').waitFor();await a.getByRole('button',{name:'Seguir jugando',exact:true}).click();assert.equal(new URL(a.url()).pathname,'/arena');
 await a.getByRole('link',{name:'Inicio',exact:true}).click();await a.getByRole('button',{name:'Sí, abandonar',exact:true}).click();await a.waitForURL('http://localhost:5179/');await b.locator('.arena-result').waitFor({timeout:12000});
 const second=(await db.collection('arenaSeats').doc(users[1]).get()).data();assert.equal((await db.collection('arenaMatches').doc(second.matchId).get()).data().reason,'abandon');assert.equal((await db.collection('users').doc(users[0]).get()).data().medals.bronze,10);assert.equal((await db.collection('users').doc(users[1]).get()).data().medals.bronze,10);report.checks.push('navigation requires confirmation; cancelling keeps match; confirming settles opponent pot');
 assert.deepEqual(errors,[]);report.pageErrors=errors;
 writeFileSync(out+'arena-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(e){report.failure=e.message;report.bodies=await Promise.all(contexts.map(async c=>c.pages()[0]?.locator('.arena-page').innerText().catch(()=>'')));const games=await db.collection('arenaMatches').get();report.games=games.docs.map(d=>({phase:d.data().phase,round:d.data().round,reason:d.data().reason,answers:d.data().answers}));writeFileSync(out+'arena-browser-failure.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));throw e;}finally{await browser.close();stop();vite.kill();await new Promise(r=>server.close(r));for(const uid of users){await db.recursiveDelete(db.collection('users').doc(uid));await auth.deleteUser(uid);}for(const collection of ['arenaSeats','arenaQueues','arenaMatches','arenaPairs','questions'])await db.recursiveDelete(db.collection(collection));}