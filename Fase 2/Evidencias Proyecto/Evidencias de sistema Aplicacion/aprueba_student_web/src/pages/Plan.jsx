import ContentSkeleton from '../components/ContentSkeleton';
import './Home.css';
import './Settings.css';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
const TESTS=[['m1','M1'],['m2','M2'],['lectora','Lectora / Reading'],['cien','Ciencias / Science'],['hist','Historia / History']];
export default function Plan() {
  const {user,updateUserState}=useAuth(),{lang}=useTheme(),en=lang==='en';
  const [plans,setPlans]=useState([]),[testId,setTestId]=useState('m1'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const operation=useRef(null);
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setLoadError('');apiFetch('/plans',{signal:controller.signal}).then(res=>{if(!controller.signal.aborted)setPlans(res.data);}).catch(err=>{if(!controller.signal.aborted)setLoadError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[revision]);
  const choose=async planId=>{
    if(busy)return;
    const payload={planId,billingCycle:'monthly',...(planId==='uni'?{testId}:{})};
    const signature=JSON.stringify(payload);
    if(operation.current && operation.current.signature!==signature){setMessage(en?'Retry the pending selection first.':'Reintenta primero la selección pendiente.');return;}
    operation.current ||= {signature,id:crypto.randomUUID()};setBusy(true);
    try {const res=await apiFetch('/plans/subscribe',{method:'POST',body:JSON.stringify({...payload,requestId:operation.current.id})});updateUserState(res.data.user);operation.current=null;setMessage(en?'Demo plan activated. No payment was made.':'Plan de demostración activado. No se realizó ningún cobro.');}
    catch(err){setMessage(err.message);if(err.status>=400 && err.status<500)operation.current=null;}
    finally{setBusy(false);}
  };
  return <div className="settings-page plan-page"><h1>{en?'Your plan':'Tu plan'}</h1>
    <p role="note">{en?'PAYMENT DEMO · No charge, no real subscription or receipt.':'DEMOSTRACIÓN DE PAGOS · Sin cobros, suscripciones reales ni boletas.'}</p>
    <p>{en?'Current plan':'Plan actual'}: {user?.plan || 'free'} {user?.planStatus==='simulated' && (en?'(simulated)':'(simulado)')}</p>
    {message && <p role="status">{message}</p>}
    {loading ? <ContentSkeleton kind="plans" /> : loadError ? <div role="alert"><p>{loadError}</p><button className="ui-button" onClick={()=>setRevision(v=>v+1)}>{en?'Retry':'Reintentar'}</button></div> : plans.length===0 ? <p>{en?'No plans available.':'No hay planes disponibles.'}</p> : <div className="home-grid">{plans.map(plan=><section className={`home-panel plan-card plan-card--${plan.id} ${plan.popular ? 'plan-card--featured' : ''}`} key={plan.id}><h2>{en?plan.nameEn:plan.name}</h2>{plan.popular && <span className="plan-badge">{en?'All tests':'Todas las pruebas'}</span>}<p className="plan-price"><strong>${plan.price.monthly.toLocaleString('es-CL')} CLP</strong> {en?'/ month':'/ mes'}</p>
      <p>{plan.id==='free'?(en?'10 base + 5 school + 5 address · 20 daily max':'10 base + 5 colegio + 5 dirección · 20 máximo diario'):plan.id==='uni'?(en?'Unlimited questions in your chosen test for one month.':'Preguntas ilimitadas en una prueba elegida por un mes.'):(en?'Unlimited questions in all tests for one month.':'Preguntas ilimitadas en todas las pruebas por un mes.')}</p>
      {plan.id==='uni' && <label>{en?'Test':'Prueba'}<select value={testId} disabled={busy} onChange={e=>setTestId(e.target.value)}>{TESTS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
      <button disabled={busy || plan.paymentMode!=='simulation'} onClick={()=>choose(plan.id)}>{en?'Simulate selection':'Simular selección'}</button>
    </section>)}</div>}</div>;
}
