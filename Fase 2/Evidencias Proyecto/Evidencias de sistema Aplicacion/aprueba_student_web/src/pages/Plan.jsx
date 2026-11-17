import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import './Home.css';
import './Settings.css';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiFetch} from '../api/client';
import {useAuth} from '../auth/useAuth';
import {useTheme} from '../context/useTheme';
const TESTS=[['m1','M1'],['m2','M2'],['lectora','Lectora / Reading'],['cien','Ciencias / Science'],['hist','Historia / History']];
export default function Plan(){
 const {user,updateUserState}=useAuth(),{lang}=useTheme(),en=lang==='en';
 const [plans,setPlans]=useState([]),[testId,setTestId]=useState('m1'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0),[subscription,setSubscription]=useState(null);
 const operation=useRef(null),sandbox=plans.some(p=>p.paymentMode==='paypal-sandbox');
 const checkPayment=useCallback(async()=>{
   const res=await apiFetch('/plans/paypal');setSubscription(res.data.subscription);updateUserState(res.data.user);return res.data;
 },[updateUserState]);
 useEffect(()=>{const controller=new AbortController();apiFetch('/plans',{signal:controller.signal}).then(res=>{if(!controller.signal.aborted)setPlans(res.data);}).catch(err=>{if(!controller.signal.aborted)setLoadError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[revision]);
 useEffect(()=>{if(!sandbox)return;let active=true;apiFetch('/plans/paypal').then(res=>{if(active){setSubscription(res.data.subscription);updateUserState(res.data.user);}}).catch(err=>{if(active)setMessage(err.message);});return()=>{active=false;};},[sandbox,updateUserState]);
 const choose=async planId=>{
   if(busy)return;setBusy(true);
   const key=`aprueba:plan-operation:${user.uid}`;
   try{
     if(sandbox&&planId==='free'){
       const res=await apiFetch('/plans/paypal/cancel',{method:'POST',body:'{}'});updateUserState(res.data.user);setSubscription(res.data.subscription);sessionStorage.removeItem(key);operation.current=null;
       setMessage(en?'Renewal cancelled. Confirmed access remains until the end of the paid test period.':'Renovación cancelada. El acceso confirmado se conserva hasta el fin del período pagado de prueba.');return;
     }
     const payload={planId,billingCycle:'monthly',...(planId==='uni'?{testId}:{})},signature=JSON.stringify(payload);
     if(!operation.current){try{operation.current=JSON.parse(sessionStorage.getItem(key));}catch{sessionStorage.removeItem(key);}}
     if(operation.current&&operation.current.signature!==signature)throw new Error(en?'Retry the pending selection first.':'Reintenta primero la selección pendiente.');
     operation.current||={signature,id:crypto.randomUUID()};sessionStorage.setItem(key,JSON.stringify(operation.current));
     const res=await apiFetch(sandbox?'/plans/paypal':'/plans/subscribe',{method:'POST',body:JSON.stringify({...payload,requestId:operation.current.id})});
     sessionStorage.removeItem(key);operation.current=null;
     if(sandbox){setSubscription(res.data.subscription);const url=res.data.subscription?.approvalUrl;
       if(url){const target=new URL(url);if(target.protocol!=='https:'||target.hostname!=='www.sandbox.paypal.com')throw new Error('Invalid sandbox URL');window.location.assign(target.href);}
       else setMessage(en?'Check the existing subscription before starting another.':'Comprueba la suscripción existente antes de iniciar otra.');
     }else{updateUserState(res.data.user);setMessage(en?'Demo plan activated. No payment was made.':'Plan de demostración activado. No se realizó ningún cobro.');}
   }catch(err){setMessage(err.message);if(err.status>=400&&err.status<500&&err.status!==409){operation.current=null;sessionStorage.removeItem(key);}}
   finally{setBusy(false);}
 };
 const refresh=async()=>{if(busy)return;setBusy(true);try{const data=await checkPayment();setMessage(data.user.paymentMode==='paypal-sandbox'&&data.user.planStatus==='active'?(en?'Test payment confirmed. Your plan is enabled.':'Pago de prueba confirmado. Tu plan está habilitado.'):(en?'No completed payment confirmed yet. You can retry.':'Todavía no hay un pago completado confirmado. Puedes volver a comprobar.'));}catch(err){setMessage(err.message);}finally{setBusy(false);}};
 return <div className="settings-page plan-page"><h1>{en?'Your plan':'Tu plan'}</h1>
 <p>Facsímil · {en?'Coming soon; not included as an available feature.':'Próximamente; aún no está disponible en ningún plan.'}</p>
 <p role="note">{sandbox?(en?'PAYPAL SANDBOX · Test payments only. USD amounts are demo values, not a conversion from CLP.':'PAYPAL SANDBOX · Solo pagos de prueba. Los importes USD son valores de demostración, no una conversión de CLP.'):(en?'PAYMENT DEMO · No real charge or receipt.':'DEMOSTRACIÓN DE PAGOS · Sin cobros ni boletas reales.')}</p>
 <p>{en?'Current plan':'Plan actual'}: {uiText(lang,user?.plan||'free')} {user?.planStatus==='simulated'&&(en?'(simulated)':'(simulado)')}</p>
 {sandbox&&<section className="home-panel"><h2>{en?'Payment status':'Estado del pago'}</h2><p>{subscription?({APPROVAL_PENDING:en?'Awaiting approval in PayPal':'Pendiente de aprobación en PayPal',APPROVED:en?'Approved; awaiting payment confirmation':'Aprobado; esperando confirmación del pago',ACTIVE:en?'Subscription active; check payment confirmation below':'Suscripción activa; comprueba la confirmación del pago',CANCELLED:en?'Renewal cancelled':'Renovación cancelada',SUSPENDED:en?'Subscription suspended':'Suscripción suspendida',EXPIRED:en?'Subscription expired':'Suscripción vencida'}[subscription.status]||(en?'Pending confirmation':'Pendiente de confirmación')):(en?'No subscription started.':'No hay una suscripción iniciada.')}</p><button disabled={busy} onClick={refresh}>{en?'Check test payment':'Comprobar pago de prueba'}</button>{subscription?.approvalUrl&&<a href={subscription.approvalUrl}>{en?'Continue in PayPal Sandbox':'Continuar en PayPal Sandbox'}</a>}</section>}
 {message&&<p role="status">{message}</p>}
 {loading?<ContentSkeleton kind="plans"/>:loadError?<div role="alert"><p>{loadError}</p><button onClick={()=>{setLoading(true);setLoadError('');setRevision(v=>v+1);}}>{en?'Retry':'Reintentar'}</button></div>:plans.length===0?<p>{en?'No plans available.':'No hay planes disponibles.'}</p>:<div className="home-grid">{plans.map(plan=><section className={`home-panel plan-card plan-card--${plan.id} ${plan.popular?'plan-card--featured':''}`} key={plan.id}><h2>{en?plan.nameEn:plan.name}</h2>{plan.popular&&<span className="plan-badge">{en?'All tests':'Todas las pruebas'}</span>}<p className="plan-price"><strong>${plan.price.monthly.toLocaleString('es-CL')} CLP</strong> {en?'/ month':'/ mes'}</p>
 {plan.sandboxPrice&&<p><strong>{en?'Test checkout':'Pago de prueba'}: {plan.sandboxPrice.amount} {plan.sandboxPrice.currency} / {en?'month':'mes'}</strong></p>}
 <p>{plan.id==='free'?(en?'10 base + 5 school + 5 address · 20 daily max':'10 base + 5 colegio + 5 dirección · 20 máximo diario'):plan.id==='uni'?(en?'Unlimited questions in your chosen test for one month.':'Preguntas ilimitadas en una prueba elegida por un mes.'):(en?'Unlimited questions in all tests for one month.':'Preguntas ilimitadas en todas las pruebas por un mes.')}</p>
 {plan.id==='uni'&&<label>{en?'Test':'Prueba'}<select value={testId} disabled={busy} onChange={e=>setTestId(e.target.value)}>{TESTS.map(([id,label])=><option key={id} value={id}>{uiText(lang,label)}</option>)}</select></label>}
 <button disabled={busy||!['simulation','paypal-sandbox'].includes(plan.paymentMode)||(sandbox&&plan.id==='free'&&!subscription)} onClick={()=>choose(plan.id)}>{sandbox?(plan.id==='free'?(en?'Cancel renewal':'Cancelar renovación'):(en?'Try with PayPal':'Probar con PayPal')):(en?'Simulate selection':'Simular selección')}</button></section>)}</div>}</div>;
}
