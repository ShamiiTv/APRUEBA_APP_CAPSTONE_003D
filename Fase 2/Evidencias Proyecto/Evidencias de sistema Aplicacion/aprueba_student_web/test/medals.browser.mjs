import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>localStorage.setItem('token','fixture'));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={uid:'fixture',name:'Alumna',onboardingCompleted:true,theme:'light',locale:'es'};
 let summary={medals:{bronze:15,silver:0,gold:0,diamond:0,platinum:5},history:[],redemptions:[]};
 let failSummary=false,failCatalog=false,loseResponse=false,rejectExchange=false;
 const writes=[],completed=new Set();
 await page.route('http://localhost:4000/api/v1/**',async route=>{
  const req=route.request();const path=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>route.fulfill({headers,status,json:status===200?{data,error:null}:{data:null,error:{message:'Error de prueba'}}});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(path.endsWith('/auth/me'))return reply(user);
  if(path.endsWith('/medals/exchange')){
   const b=req.postDataJSON();writes.push(b);
   if(rejectExchange)return reply(null,409);
   if(!completed.has(b.requestId)){completed.add(b.requestId);summary.medals.bronze-=5;summary.medals.silver++;summary.history.push({id:b.requestId,tier:'silver',amount:1,reason:'Canje registrado',createdAt:'2026-10-09T15:00:00Z'});}
   if(loseResponse){loseResponse=false;return route.abort('failed');}
   return reply({medals:summary.medals,upgradedTier:'silver'});
  }
  if(path.endsWith('/benefits/redeem')){
   const b=req.postDataJSON();writes.push(b);summary.medals.platinum-=2;summary.redemptions=[{id:b.requestId,name:'Beneficio fixture',costPlatinum:2,status:'pending'}];
   return reply({medals:summary.medals,redemption:summary.redemptions[0]});
  }
  if(path.endsWith('/medals/benefits'))return failCatalog?reply(null,503):reply([{id:'fixture-benefit',name:'Beneficio fixture',costPlatinum:2,stock:1,canRedeem:true}]);
  if(path.endsWith('/medals'))return failSummary?reply(null,503):reply(summary);
  return reply({});
 });
 const url='http://127.0.0.1:5173/medallas';
 await page.goto(url);const form=page.locator('.medals-page');await form.getByRole('button',{name:'Canjear Bronce',exact:true}).waitFor();
 assert.equal(await form.getByRole('button',{name:'Canjear Plata',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 console.log('PASS: real balances, insufficient funds and mobile layout');
 loseResponse=true;await form.getByRole('button',{name:'Canjear Bronce',exact:true}).click();await form.getByRole('button',{name:'Reintentar solicitud pendiente'}).waitFor();
 await page.reload();await form.getByRole('button',{name:'Reintentar solicitud pendiente'}).click();await form.getByText('Canje registrado: 1 medalla de Plata.',{exact:true}).waitFor();
 assert.equal(writes[0].requestId,writes[1].requestId);assert.equal(summary.medals.bronze,10);
 console.log('PASS: lost response survives reload and reuses the same request identifier');
 await form.getByRole('button',{name:'Solicitar Beneficio fixture',exact:true}).click();await form.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(writes.length,2);
 await form.getByRole('button',{name:'Solicitar Beneficio fixture',exact:true}).click();await form.getByRole('button',{name:'Confirmar solicitud',exact:true}).click();await form.getByText('Entrega pendiente · 2 Platino',{exact:true}).waitFor();assert.equal(summary.medals.platinum,3);
 console.log('PASS: explicit benefit confirmation, debit and pending delivery history');
 failCatalog=true;await form.getByRole('button',{name:'Actualizar saldos y catálogo'}).click();await form.getByText('No se pudo cargar el catálogo de beneficios.').waitFor();assert.equal(await form.getByRole('button',{name:'Canjear Bronce',exact:true}).isDisabled(),false);
 console.log('PASS: catalog failure does not hide valid balances');
 failSummary=true;await form.getByRole('button',{name:'Actualizar saldos y catálogo'}).click();await form.getByText('No se pudieron cargar tus saldos. Vuelve a intentar.').waitFor();assert.equal(await form.getByRole('button',{name:'Canjear Bronce',exact:true}).isDisabled(),true);
 failSummary=false;await form.getByRole('button',{name:'Actualizar saldos y catálogo'}).click();await page.waitForTimeout(150);
 rejectExchange=true;await form.getByRole('button',{name:'Canjear Bronce',exact:true}).click();await form.getByText('Error de prueba',{exact:true}).waitFor();assert.equal(await form.getByRole('button',{name:'Canjear Bronce',exact:true}).isDisabled(),false);
 console.log('PASS: failed balances block spending and definitive rejection clears pending operation');
 assert.deepEqual(errors,[]);
} finally {await browser.close();}
