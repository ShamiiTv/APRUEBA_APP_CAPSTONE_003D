// Isolated UI fixtures; no production users, credentials or data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const out=process.env.STUDY_CAPTURE_DIR;
const webUrl=process.env.WEB_TEST_URL || 'http://127.0.0.1:5179';
try{
for(const [lang,theme,width] of [['es','light',1440],['en','dark',1440],['es','light',390],['en','dark',360]]){
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.addInitScript(({lang,theme})=>{localStorage.setItem('aprueba:session','1');localStorage.setItem('lang',lang);localStorage.setItem('theme',theme);},{lang,theme});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let settings={dailyGoal:10,testIds:['m1','hist']},failLoad=false,failSave=false,complete=false,saves=0;
 const user={uid:'fixture',name:'Diseño Aprueba',email:'fixture@example.test',emailVerified:true,onboardingCompleted:true,selectedTests:['m1','hist'],locale:lang,theme,quota:{used:0,max:20},streak:0,medals:{}};
 await context.route('**/api/v1/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  const headers={'access-control-allow-origin':request.headers().origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  let data={items:[],unreadCount:0};
  if(path.endsWith('/auth/refresh'))data={tokens:{accessToken:'isolated-token'}};
  if(path.endsWith('/auth/me'))data=user;
  if(path.endsWith('/study-plan')){
   if((request.method()==='PUT'&&failSave)||(request.method()==='GET'&&failLoad))return route.fulfill({status:503,headers,json:{data:null,error:{message:'No se pudo guardar o cargar el plan'}}});
   if(request.method()==='PUT'){settings=request.postDataJSON();saves++;}
   data={settings,saved:saves>0,date:'2026-11-18',completedToday:complete?settings.dailyGoal:0,remainingGoal:complete?0:settings.dailyGoal,quotaRemaining:20,scheduled:complete?0:settings.dailyGoal,tasks:settings.testIds.map(id=>({testId:id,label:id==='hist'?'Historia':'Matemática M1',answered:0,accuracy:null,available:id==='hist'?0:423,completed:0,reason:id==='hist'?'unavailable':'explore',scheduled:complete||id==='hist'?0:settings.dailyGoal}))};
  }
  return route.fulfill({headers,json:{data,error:null,meta:{}}});
 });
 await page.goto(webUrl+'/plan-estudio');
 await page.locator('.study-task').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.getByRole('spinbutton').inputValue(),'10');
 assert.equal(await page.getByRole('button',{name:lang==='en'?'Practice History':'Practicar Historia',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('.study-task-metrics dd').nth(1).innerText(),'—');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(out) await page.screenshot({path:out+`study-${lang}-${theme}-${width}.png`,fullPage:true});
 if(lang==='en')assert.ok(!/Matemática|Próximamente|preguntas|Configura|Aciertos|Historial/.test(await page.locator('main').innerText()));
 await page.getByRole('spinbutton').fill('5');
 assert.equal(await page.getByRole('button',{name:lang==='en'?'Practice Mathematics M1':'Practicar Matemática M1',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:lang==='en'?'Save plan':'Guardar plan',exact:true}).click();
 await page.getByText(lang==='en'?'Your plan was saved.':'Tu plan quedó guardado.',{exact:true}).waitFor();
 assert.equal(settings.dailyGoal,5);assert.equal(saves,1);
 failSave=true;await page.getByRole('spinbutton').fill('7');await page.getByRole('button',{name:lang==='en'?'Save plan':'Guardar plan',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('spinbutton').inputValue(),'7');assert.equal(settings.dailyGoal,5);failSave=false;
 complete=true;await page.reload();await page.getByText(lang==='en'?"You reached today's goal!":'¡Cumpliste tu meta de hoy!',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:lang==='en'?'Practice Mathematics M1':'Practicar Matemática M1',exact:true}).isDisabled(),false);
 failLoad=true;await page.reload();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.study-task').count(),0);failLoad=false;await page.getByRole('button',{name:lang==='en'?'Retry':'Reintentar',exact:true}).click();await page.locator('.study-task').first().waitFor();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({lang,theme,width,save:true,failedSaveDraftPreserved:true,goalComplete:true,loadRecovery:true,noOverflow:true}));
 await context.close();
}
}finally{await browser.close();}
