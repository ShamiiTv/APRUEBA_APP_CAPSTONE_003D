// UI checks with mock API responses; no real student or subscription is used.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({ headless:true,executablePath:process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const context=await browser.newContext({ viewport:{ width:1280,height:900 } });
  await context.addInitScript(() => { localStorage.setItem('token','browser-fixture');localStorage.setItem('lang','es'); });
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',error => errors.push(error.message));
  const user={ uid:'fixture',name:'Alumno de prueba',onboardingCompleted:true,selectedTests:['m1','hist'],difficulty:'d2',quota:{ used:0,max:20 },streak:0,medals:{} };
  let settings={ dailyGoal:10,testIds:['m1','hist'] };
  let saved=false,complete=false,failLoad=false,failSave=false;
  let saves=0;
  const summary=() => ({ settings,saved,date:'2026-10-09',completedToday:complete ? settings.dailyGoal : 0,remainingGoal:complete ? 0 : settings.dailyGoal,quotaRemaining:20,scheduled:complete ? 0 : settings.dailyGoal,
    tasks:settings.testIds.map(id => ({ testId:id,label:id === 'hist' ? 'Historia' : 'Matemática M1',answered:0,accuracy:null,available:id === 'hist' ? 0 : 20,completed:0,reason:id === 'hist' ? 'unavailable' : 'explore',scheduled:complete || id === 'hist' ? 0 : settings.dailyGoal })) });
  await page.route('http://localhost:4000/api/v1/**',async route => {
    const request=route.request(); const path=new URL(request.url()).pathname;
    const headers={ 'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status:204,headers });
    if (path.endsWith('/study-plan')) {
      if ((request.method() === 'PUT' && failSave) || (request.method() === 'GET' && failLoad)) return route.fulfill({ status:503,headers,json:{ data:null,error:{ message:'No se pudo guardar o cargar el plan' } } });
      if (request.method() === 'PUT') { saves++;settings=request.postDataJSON();saved=true;return route.fulfill({ headers,json:{ data:{ settings },error:null } }); }
      return route.fulfill({ headers,json:{ data:summary(),error:null } });
    }
    const data=path.endsWith('/auth/me') ? user : { question:null,noQuestions:true,allCompleted:false,user };
    return route.fulfill({ headers,json:{ data,error:null,meta:{} } });
  });
  const url=(process.env.WEB_TEST_URL || 'http://127.0.0.1:5173')+'/plan-estudio';
  await page.goto(url);
  await page.getByRole('heading',{ name:'Configura tu meta' }).waitFor();
  assert.equal(await page.getByRole('spinbutton').inputValue(),'10');
  assert.equal(await page.getByRole('checkbox',{ name:'Historia',exact:true }).isChecked(),true);
  assert.equal(await page.getByRole('button',{ name:'Practicar Historia',exact:true }).isDisabled(),true);
  console.log('PASS: initial selected tests and unavailable subject');
  await page.getByRole('spinbutton').fill('5');
  await page.getByRole('button',{ name:'Guardar plan',exact:true }).click();
  await page.getByText('Tu plan quedó guardado.').waitFor();
  await page.getByRole('heading',{ name:'Configura tu meta' }).waitFor();
  assert.equal(saves,1);
  await page.reload();
  await page.getByRole('heading',{ name:'Configura tu meta' }).waitFor();
  assert.equal(await page.getByRole('spinbutton').inputValue(),'5');
  console.log('PASS: saved goal persists after reload');
  await page.getByRole('button',{ name:'Practicar Matemática M1',exact:true }).click();
  await page.waitForURL('**/practicar?testId=m1&difficulty=d2');
  console.log('PASS: recommended task opens the selected practice');
  complete=true;
  await page.goto(url);
  await page.getByText('¡Cumpliste tu meta de hoy!').waitFor();
  assert.equal(await page.getByRole('button',{ name:'Practicar Matemática M1',exact:true }).isDisabled(),true);
  console.log('PASS: fulfilled daily goal creates no extra tasks');
  failLoad=true;
  await page.reload();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('heading',{ name:'Recomendaciones por prueba' }).count(),0);
  failLoad=false;
  await page.getByRole('button',{ name:'Reintentar',exact:true }).click();
  await page.getByRole('heading',{ name:'Configura tu meta' }).waitFor();
  console.log('PASS: failed load recovers without invented recommendations');
  failSave=true;
  await page.getByRole('spinbutton').fill('7');
  await page.getByRole('button',{ name:'Guardar plan',exact:true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('spinbutton').inputValue(),'7');
  assert.equal(settings.dailyGoal,5);
  failSave=false;
  await page.getByRole('button',{ name:'Guardar plan',exact:true }).click();
  await page.getByText('Tu plan quedó guardado.').waitFor();
  assert.equal(settings.dailyGoal,7);
  assert.deepEqual(errors,[]);
  console.log('PASS: failed save preserves the draft and can be retried');
} finally { await browser.close(); }
