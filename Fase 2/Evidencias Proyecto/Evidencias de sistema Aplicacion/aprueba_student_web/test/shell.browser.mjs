// Browser fixtures only: never reads or writes production accounts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const captureDir=process.env.SHELL_CAPTURE_DIR;
const webUrl=process.env.WEB_TEST_URL || 'http://127.0.0.1:5179';
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
for(const [width,reduced,fallback] of [[1440,false,false],[390,false,false],[1440,true,false],[1440,false,true]]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:reduced?'reduce':'no-preference'});
 await context.addInitScript(({fallback})=>{
  localStorage.setItem('aprueba:session','1');if(!localStorage.getItem('theme'))localStorage.setItem('theme','light');localStorage.setItem('lang','es');
  window._themeCalls=0;
  if(fallback)document.startViewTransition=undefined;
  else{const start=document.startViewTransition.bind(document);document.startViewTransition=callback=>{window._themeCalls++;return start(callback);};}
 },{fallback});
 let release;const gate=new Promise(resolve=>release=resolve);let fail=false;
 const user={uid:'fixture',name:'Persona privada',emailVerified:true,onboardingCompleted:true,selectedTests:['m1'],locale:'es',theme:'light',quota:{used:0,max:20},streak:0,medals:{},plan:'all'};
 await context.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={items:[],unreadCount:0};
  const headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,PATCH,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(path.endsWith('/auth/refresh'))data={tokens:{accessToken:'fixture'}};
  if(path.endsWith('/auth/me')){await gate;data=user;}
  if(path.endsWith('/auth/profile')){
   if(fail)return route.fulfill({status:503,headers,json:{data:null,error:{message:'No se pudo guardar'}}});
   Object.assign(user,req.postDataJSON());data=user;
  }
  if(path.endsWith('/study-plan'))data={settings:{dailyGoal:10,testIds:['m1']},saved:true,date:'2026-11-18',completedToday:0,remainingGoal:10,quotaRemaining:20,scheduled:10,tasks:[{testId:'m1',label:'Matemática M1',answered:0,accuracy:null,available:423,completed:0,reason:'explore',scheduled:10}]};
  return route.fulfill({headers,json:{data,error:null,meta:{}}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(webUrl+'/plan-estudio',{waitUntil:'domcontentloaded'});
 await page.locator('.shell-restoring').waitFor();
 assert.equal(await page.locator('.shell-nav-slot').count(),9);assert.equal(await page.getByText('Persona privada').count(),0);
 assert.equal(await page.locator('aside a').count(),0);
 const before=await page.locator('aside').boundingBox();
 if(captureDir&&!reduced&&!fallback)await page.screenshot({path:`${captureDir}shell-loading-${width}.png`,fullPage:true});
 release();await page.locator('.study-task').waitFor();const after=await page.locator('aside').boundingBox();assert.equal(before.width,after.width);if(width>720)assert.equal(before.height,after.height);
 fail=true;await page.getByRole('button',{name:'Cambiar tema',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>document.body.classList.contains('dark')),false);assert.equal(await page.evaluate(()=>window._themeCalls),0);fail=false;
 await page.getByRole('button',{name:'Cambiar tema',exact:true}).click();await page.waitForFunction(()=>document.body.classList.contains('dark'));
 if(!reduced&&!fallback){
  assert.equal(await page.evaluate(()=>window._themeCalls),1);
  await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.getKeyframes().some(k=>k.clipPath)));
  if(captureDir)await page.screenshot({path:`${captureDir}theme-reveal-${width}.png`});
 }
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-reveal')&&!document.documentElement.classList.contains('theme-color-transition'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),'dark');
 if(reduced||fallback)assert.equal(await page.evaluate(()=>window._themeCalls),0);
 await page.reload();await page.locator('.study-task').waitFor();
 assert.equal(await page.evaluate(()=>document.body.classList.contains('dark')),true);
 assert.equal(await page.evaluate(()=>window._themeCalls),0);
 await page.getByRole('button',{name:'Cambiar tema',exact:true}).click();await page.waitForFunction(()=>!document.body.classList.contains('dark'));
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-reveal')&&!document.documentElement.classList.contains('theme-color-transition'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),'light');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,reduced,fallback,shell:true,profilePrivateUntilLoaded:true,failedSavePreservesTheme:true,bothDirections:true}));
 await context.close();
}
}finally{await browser.close();}
