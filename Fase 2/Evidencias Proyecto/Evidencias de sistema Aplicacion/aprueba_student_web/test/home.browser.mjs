// Browser smoke checks with explicit fixtures; never reads real student accounts.
// Requires a running Vite server and Playwright provided by the local runtime.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => { localStorage.setItem('token','browser-fixture'); localStorage.setItem('lang','es'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const user = { uid: 'fixture-student', name: 'Alumno de prueba', onboardingCompleted: true, selectedTests: ['m1'], difficulty: 'd2', plan: 'free', medals: {}, quota: { used: 0, max: 20 }, streak: 0 };
  let mode = 'empty';
  const date = new Date().toISOString().slice(0,10);
  const data = () => ({
    answered: mode === 'active' ? 2 : 0, correct: mode === 'active' ? 1 : 0, accuracy: mode === 'active' ? 50 : null,
    streak: mode === 'active' ? 1 : 0, lastActiveDate: mode === 'active' ? date : null, practicedToday: mode === 'active',
    medals: { bronze: mode === 'active' ? 1 : 0, silver: 0, gold: 0, diamond: 0, platinum: 0 },
    quota: { used: mode === 'active' ? 2 : 0, max: 20, unlimited: false, date }, today: { answered: mode === 'active' ? 2 : 0, correct: mode === 'active' ? 1 : 0 },
    subjects: [{ testId:'m1',label:'Matemática M1', available:10, completed:mode === 'active' ? 2 : 0, answered:mode === 'active' ? 2 : 0, correct:mode === 'active' ? 1 : 0, accuracy:mode === 'active' ? 50 : null,coverage:mode === 'active' ? 20 : 0 }, { testId:'hist',label:'Historia',available:0,completed:0,answered:0,correct:0,accuracy:null,coverage:null }],
    recent: mode === 'active' ? [{ testId:'m1',isCorrect:true,answeredAt:new Date().toISOString() }] : [], updatedAt:new Date().toISOString(),
  });
  await page.route('http://localhost:4000/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status:204, headers });
    if (path.endsWith('/progress') && mode === 'error') return route.fulfill({ status:503,headers,json:{ data:null,error:{message:'Fixture unavailable',code:'PROGRESS_UNAVAILABLE'} } });
    const response = path.endsWith('/auth/me') ? user : path.endsWith('/progress') ? data() : { question:null,noQuestions:true,allCompleted:false,user };
    return route.fulfill({ status:200,headers,json:{ data:response,error:null,meta:{} } });
  });
  await page.goto(process.env.WEB_TEST_URL || 'http://127.0.0.1:5173/');
  await page.getByText('Tu racha comienza al responder una pregunta.', { exact:false }).waitFor();
  assert.equal(await page.locator('.home-panel').filter({ has:page.getByRole('heading',{name:'Respondidas',exact:true}) }).locator('.home-value').textContent(),'0');
  assert.equal(await page.locator('progress').getAttribute('value'),'0');
  assert.equal(await page.locator('article').filter({ has:page.getByRole('heading',{name:'Historia',exact:true}) }).getByRole('button').isDisabled(),true);
  console.log('PASS: new account, zero activity and unavailable bank');
  mode = 'active';
  await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await page.getByText('50%',{exact:true}).waitFor();
  assert.equal(await page.locator('progress').getAttribute('value'),'2');
  await page.getByRole('heading',{name:'Últimas respuestas'}).waitFor();
  console.log('PASS: actual dashboard data, current-bank progress and recent answers');
  await page.locator('article').filter({ has:page.getByRole('heading',{name:'Matemática M1',exact:true}) }).getByRole('button').click();
  await page.waitForURL('**/practicar?testId=m1&difficulty=d2');
  console.log('PASS: practice shortcut selects the subject and difficulty');
  mode = 'error';
  await page.goto(process.env.WEB_TEST_URL || 'http://127.0.0.1:5173/');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.home-value').count(),0);
  mode = 'empty';
  await page.getByRole('button',{name:'Reintentar',exact:true}).click();
  await page.getByText('Tu racha comienza al responder una pregunta.',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: unavailable API shows a retry without invented metrics');
} finally { await browser.close(); }
