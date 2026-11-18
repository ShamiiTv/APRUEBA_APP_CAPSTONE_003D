import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
for(const [kind,cap] of [['free',10],['free',15],['free',20],['all',10],['uni',10],['expired',10]]){
 const context=await browser.newContext({viewport:{width:390,height:1000}});
 await context.addInitScript(()=>{localStorage.setItem('aprueba:session','1');localStorage.setItem('lang','es');});
 let goal=10;const paid=kind==='all'||kind==='uni';
 const limits={minGoal:1,maxGoal:paid?100:cap,freeDailyMax:cap,paidGoalMax:100,unlimitedAll:kind==='all',unlimitedTestId:kind==='uni'?'m1':null};
 const user={uid:'fixture',name:'Fixture',emailVerified:true,onboardingCompleted:true,selectedTests:['m1','m2'],locale:'es',theme:'light',quota:{max:cap,used:cap},medals:{},streak:0};
 await context.route('**/api/v1/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':req.headers().origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS'};let data={items:[],unreadCount:0};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(path.endsWith('/auth/refresh'))data={tokens:{accessToken:'fixture'}};
  if(path.endsWith('/auth/me'))data=user;
  if(path.endsWith('/study-plan')){
   if(req.method()==='PUT')goal=req.postDataJSON().dailyGoal;
   data={settings:{dailyGoal:goal,testIds:['m1','m2']},saved:true,date:'2026-11-18',limits,completedToday:goal,remainingGoal:0,quotaRemaining:kind==='all'?null:kind==='uni'?0:1,scheduled:0,requestedGoal:kind==='expired'?50:goal,goalAdjusted:kind==='expired',tasks:['m1','m2'].map(testId=>({testId,label:testId==='m1'?'Matemática M1':'Matemática M2',answered:10,accuracy:80,available:100,completed:10,remaining:90,scheduled:0,reason:'continue'}))};
  }
  return route.fulfill({headers,json:{data,error:null,meta:{}}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.WEB_TEST_URL || 'http://127.0.0.1:5179')+'/plan-estudio');await page.locator('.study-task').first().waitFor();
 assert.equal(await page.getByRole('spinbutton').getAttribute('max'),String(paid?100:cap));
 assert.equal(await page.getByRole('button',{name:'Practicar Matemática M1',exact:true}).isEnabled(),true);
 assert.equal(await page.getByRole('button',{name:'Practicar Matemática M2',exact:true}).isEnabled(),kind!=='uni');
 assert.equal(await page.getByText('Llegaste a tu cuota diaria. Mañana podrás continuar.').count(),0);
 if(kind==='expired')await page.getByText('Tu meta guardada de 50 se ajustó a 10 según tu acceso actual.',{exact:true}).waitFor();
 if(kind==='uni'){
  await page.getByRole('spinbutton').fill('50');await page.getByRole('checkbox',{name:'Matemática M1',exact:true}).uncheck();
  assert.equal(await page.getByRole('spinbutton').getAttribute('max'),'10');assert.equal(await page.getByRole('spinbutton').inputValue(),'10');
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({kind,cap,quotaBound:true,goalDoesNotBlockPractice:true}));await context.close();
}
}finally{await browser.close();}
