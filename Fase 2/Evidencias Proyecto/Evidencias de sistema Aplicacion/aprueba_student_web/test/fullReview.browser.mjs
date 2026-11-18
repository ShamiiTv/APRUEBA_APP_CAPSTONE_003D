// Isolated emulators only. Requires Vite at localhost:5179, API port 4000 and Chrome.
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdtempSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
Object.assign(process.env,{NODE_ENV:'test',FIREBASE_PROJECT_ID:'demo-aprueba-full-review',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',PAYMENTS_MODE:'paypal-sandbox',PAYPAL_CLIENT_ID:'fixture',PAYPAL_CLIENT_SECRET:'fixture',PAYPAL_PLAN_UNI:'P-UNI',PAYPAL_PLAN_ALL:'P-ALL',PAYPAL_RETURN_ORIGIN:'http://localhost:5179',JWT_SECRET:'isolated-ui-access-secret',JWT_REFRESH_SECRET:'isolated-ui-refresh-secret'});
const base=fileURLToPath(new URL('../../aprueba_api/',import.meta.url));
const {db,auth}=await import(pathToFileURL(base+'src/config/firebase.js'));
const {seedQuestions}=await import(pathToFileURL(base+'src/data/seedData.js'));
await seedQuestions();
const {practiceDate}=await import(pathToFileURL(base+'src/services/practice.js'));
const {createApp}=await import(pathToFileURL(base+'src/app.js'));
const uid='home-review-'+randomUUID(),email=uid+'@example.test',password='Isolated-ui-only-123';
await auth.createUser({uid,email,password,emailVerified:true});
await db.collection('users').doc(uid).set({name:'Alumno Aprueba',email,onboardingCompleted:true,plan:'all',planStatus:'active',currentPeriodEnd:new Date(Date.now()+86400000),selectedTests:['m1','lectora'],locale:'es',theme:'dark',difficulty:'d2',lastLoginDate:practiceDate(),medals:{bronze:2},createdAt:new Date()});
const server=createApp().listen(4000,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const directory=(process.env.APRUEBA_REVIEW_OUTPUT_DIR || mkdtempSync(join(tmpdir(),'aprueba-ui-review-')))+'/',report={routes:[],screens:[],motion:{}};
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
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{window._themeDurations=[];if(document.startViewTransition){const native=document.startViewTransition.bind(document);document.startViewTransition=cb=>{const begin=performance.now(),transition=native(cb);transition.finished.then(()=>window._themeDurations.push(performance.now()-begin));return transition;};}});
 await page.goto('http://localhost:5179/login');await page.locator('#login-email').fill(email);await page.locator('#login-password').fill(password);await page.locator('button[type=submit]').click();await page.waitForURL('http://localhost:5179/');await page.locator('.dashboard-hero').waitFor();
 assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),false);
 for(const dark of [false,true]){
  const bounds=await page.getByRole('button',{name:'Cambiar tema',exact:true}).boundingBox();
  await page.getByRole('button',{name:'Cambiar tema',exact:true}).click();await page.waitForFunction(dark=>document.body.classList.contains('dark')===dark,dark);
  await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.getKeyframes().some(k=>k.clipPath)));
  const frames=await page.evaluate(()=>document.getAnimations().flatMap(a=>a.effect?.getKeyframes()||[]).filter(k=>k.clipPath).map(k=>k.clipPath));
  assert.ok(frames.some(frame=>frame.includes(`${bounds.x+bounds.width/2}px`)),'Reveal starts at theme button');
  await page.waitForTimeout(160);await page.screenshot({path:directory+`home-theme-mid-${dark?'dark':'light'}.png`});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-reveal'));
 }
 report.motion={durations:await page.evaluate(()=>window._themeDurations)};assert.ok(report.motion.durations.every(ms=>ms>=650),JSON.stringify(report.motion));
 for(const [locale,theme] of [['es','light'],['es','dark'],['en','dark']]){
  await db.collection('users').doc(uid).update({locale,theme});
  for(const path of ['/','/plan-estudio','/tutores','/tutores/analisis','/plan','/medallas','/grupos','/comunidad','/ajustes','/notificaciones','/practicar']){
   await page.goto('http://localhost:5179'+path);await page.locator('main').waitFor();await page.waitForFunction(()=>!document.querySelector('.content-skeleton'),{},{timeout:30000});
   const findings=await contrast(page);report.routes.push({path,locale,theme,contrast:findings});
   if(path==='/')await page.screenshot({path:directory+`home-${locale}-${theme}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:390,height:950});
 for(const path of ['/','/plan-estudio','/tutores','/plan','/medallas','/grupos','/comunidad','/ajustes']){
  await page.goto('http://localhost:5179'+path);await page.waitForFunction(()=>!document.querySelector('.content-skeleton'),{},{timeout:30000});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.screens.push({path,width:390,overflow});assert.equal(overflow,false,path);
  if(path==='/')await page.screenshot({path:directory+'home-mobile-en-dark.png',fullPage:true});
 }
 await page.goto('http://localhost:5179/');await page.locator('.dashboard-hero').waitFor();
 const {loadStudentProgress}=await import(pathToFileURL(base+'src/services/studentProgress.js'));
 const original=(await loadStudentProgress(uid)).progress;
 let mode='ready';
 await page.route('**/api/v1/progress',route=>{
  const headers={'access-control-allow-origin':'http://localhost:5179','access-control-allow-credentials':'true'};
  if(mode==='fail')return route.fulfill({status:503,headers,json:{data:null,error:{message:'Isolated refresh failure'}}});
  const data=structuredClone(original);
  if(mode==='ready'){data.answered=7;data.correct=5;data.accuracy=71;}
  if(mode==='completed'){for(const item of data.subjects){item.completed=item.available;item.remaining=0;}}
  if(mode==='single'){data.quota.unlimited=false;data.quota.used=data.quota.max;data.quota.unlimitedTestId='m1';}
  return route.fulfill({headers,json:{data,error:null,meta:{}}});
 });
 await page.locator('.dashboard-heading>button').click();await page.waitForFunction(()=>document.querySelector('.dashboard-metric>strong')?.textContent==='7');
 mode='fail';await page.locator('.dashboard-heading>button').click();await page.locator('.dashboard-notice[role=alert]').waitFor();
 assert.equal(await page.locator('.dashboard-metric>strong').first().innerText(),'7');assert.equal(await page.locator('.dashboard-hero').count(),1);
 mode='completed';await page.locator('.dashboard-heading>button').click();await page.waitForFunction(()=>document.querySelector('.dashboard-hero-actions button')?.disabled);
 assert.equal(await page.locator('.dashboard-subject button:enabled').count(),0);
 mode='single';await page.locator('.dashboard-heading>button').click();await page.waitForFunction(()=>!document.querySelector('.dashboard-hero-actions button')?.disabled);
 assert.equal(await page.locator('.dashboard-subject button:enabled').count(),1);
 report.homeStates={refreshFailurePreservesData:true,completedBanksBlocked:true,singlePaidTestSurvivesFreeQuota:true};
 assert.ok(report.routes.every(route=>route.contrast.length===0),'Text contrast regression: '+JSON.stringify(report.routes.filter(route=>route.contrast.length)));
 assert.deepEqual(errors,[]);report.errors=errors;writeFileSync(directory+'home-visual-review.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({uiReview:true,motion:report.motion,contrastFailures:report.routes.filter(r=>r.contrast.length),mobile:report.screens}));
}finally{await browser.close();await db.recursiveDelete(db.collection('users').doc(uid));await auth.deleteUser(uid);await new Promise(r=>server.close(r));}
