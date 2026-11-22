import ApruebaIcon from '../components/ApruebaIcon';
import SectionHeader from '../components/SectionHeader';
import ContentSkeleton from '../components/ContentSkeleton';
import {subscriptionEnd} from '../features/access';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiFetch} from '../api/client';
import {useAuth} from '../auth/useAuth';
import {useTheme} from '../context/useTheme';
import './Home.css';
import './Settings.css';
import './Plan.css';
const TESTS=[['m1','Matemática M1','Mathematics M1'],['m2','Matemática M2','Mathematics M2'],['lectora','Competencia Lectora','Reading Comprehension'],['cien','Ciencias','Science'],['hist','Historia','History']];
export default function Plan(){
 const {user,updateUserState}=useAuth(),{lang}=useTheme(),en=lang==='en';
 const [plans,setPlans]=useState([]),[testId,setTestId]=useState('m1'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0),[subscription,setSubscription]=useState(null),[checking,setChecking]=useState(false),[checkout,setCheckout]=useState(null);
 const operation=useRef(null),inFlight=useRef(null),dialog=useRef(null),sandbox=plans.some(p=>p.paymentMode==='paypal-sandbox');
 const end=subscriptionEnd(user),active=end>new Date()&&user?.plan!=='free'&&(user?.quota?.unlimited||user?.quota?.unlimitedTestId),cancelled=['CANCELLED','EXPIRED'].includes(subscription?.status);
 const date=end.getTime()?new Intl.DateTimeFormat(en?'en-GB':'es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(end):'';
 const planName=id=>id==='all'?(en?'Full access':'Acceso completo'):id==='uni'?(en?'One unlimited test':'Una prueba ilimitada'):(en?'Free plan':'Plan gratuito');
 const checkPayment=useCallback(()=>{
  if(inFlight.current)return inFlight.current;setChecking(true);
  inFlight.current=apiFetch('/plans/paypal').then(res=>{setSubscription(res.data.subscription);updateUserState(res.data.user);return res.data;}).finally(()=>{inFlight.current=null;setChecking(false);});return inFlight.current;
 },[updateUserState]);
 useEffect(()=>{const controller=new AbortController();apiFetch('/plans',{signal:controller.signal}).then(res=>{if(!controller.signal.aborted)setPlans(res.data);}).catch(err=>{if(!controller.signal.aborted)setLoadError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[revision]);
 useEffect(()=>{if(!sandbox)return;checkPayment().catch(err=>setMessage(err.message));},[sandbox,checkPayment]);
 useEffect(()=>{if(checkout&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[checkout]);
 useEffect(()=>{
  if(checkout?.phase!=='waiting')return;
  let disposed=false,timer,attempts=0,polling=false;
  const poll=async()=>{if(disposed||polling)return;polling=true;try{
    const data=await checkPayment();if(disposed)return;
    if(data.user.paymentMode==='paypal-sandbox'&&data.user.planStatus==='active'&&subscriptionEnd(data.user)>new Date()){
      window.apruebaCheckout?.close();setCheckout({phase:'confirmed'});return;
    }
   }catch(err){if(!disposed)setMessage(err.message);}
   polling=false;
   if(!disposed&&++attempts<18)timer=setTimeout(poll,5000);
   else if(!disposed)setCheckout(value=>({...value,phase:'pending'}));
  };
  poll();const returned=()=>{clearTimeout(timer);poll();};window.addEventListener('aprueba:checkout-return',returned);
  return()=>{disposed=true;clearTimeout(timer);window.removeEventListener('aprueba:checkout-return',returned);};
 },[checkout?.phase,checkPayment]);
 const closeCheckout=()=>{window.apruebaCheckout?.close();setCheckout(null);};
 const choose=async planId=>{
  if(busy)return;
  if(sandbox)window.apruebaCheckout?.prepare();
  setCheckout({phase:'opening'});setBusy(true);setMessage('');
  const key=`aprueba:plan-operation:${user.uid}`;
  try{
   const payload={planId,billingCycle:'monthly',...(planId==='uni'?{testId}:{})},signature=JSON.stringify(payload);
   if(!operation.current){try{operation.current=JSON.parse(sessionStorage.getItem(key));}catch{sessionStorage.removeItem(key);}}
   if(operation.current&&operation.current.signature!==signature)throw new Error(en?'Resume your pending subscription first.':'Continúa primero con tu suscripción pendiente.');
   operation.current||={signature,id:crypto.randomUUID()};sessionStorage.setItem(key,JSON.stringify(operation.current));
   const res=await apiFetch(sandbox?'/plans/paypal':'/plans/subscribe',{method:'POST',body:JSON.stringify({...payload,requestId:operation.current.id})});
   sessionStorage.removeItem(key);operation.current=null;
   if(sandbox){setSubscription(res.data.subscription);const url=res.data.subscription?.approvalUrl;
    if(url){const opened=window.apruebaCheckout?.navigate(url);setCheckout({phase:'waiting',approvalUrl:url,blocked:!opened});}
    else{window.apruebaCheckout?.close();await checkPayment();setCheckout(null);}
   }else{updateUserState(res.data.user);setCheckout({phase:'confirmed'});}
  }catch(err){window.apruebaCheckout?.close();setCheckout({phase:'error',error:err.message});if(err.status>=400&&err.status<500&&err.status!==409){operation.current=null;sessionStorage.removeItem(key);}}
  finally{setBusy(false);}
 };
 const cancel=async()=>{if(busy)return;setBusy(true);try{const res=await apiFetch('/plans/paypal/cancel',{method:'POST',body:'{}'});setSubscription(res.data.subscription);updateUserState(res.data.user);setMessage(res.data.abandoned?(en?'Pending request cancelled.':'Solicitud pendiente cancelada.'):(en?'Renewal cancelled. Your access remains until the end of your current period.':'Renovación cancelada. Conservas el acceso hasta el vencimiento de tu período actual.'));setCheckout(null);}catch(err){setMessage(err.message);}finally{setBusy(false);}};
 const resume=()=>{const url=subscription?.approvalUrl;if(url){const opened=window.apruebaCheckout?.open(url);setCheckout({phase:'waiting',approvalUrl:url,blocked:!opened});}};
 const waiting=checkout?.phase==='opening'||checkout?.phase==='waiting';
 return <div className="settings-page plan-page">
  <SectionHeader icon="card" title={en?'Your subscription':'Tu suscripción'} detail={en?'Monthly plans':'Planes mensuales'}>{en?'Choose the support you need to prepare for PAES.':'Elige el apoyo que necesitas para preparar la PAES.'}</SectionHeader>
  {loading?<ContentSkeleton kind="plans"/>:<>
   <section className="subscription-summary" aria-busy={checking}><div><span className={`subscription-pill ${active?'is-active':''}`}>{active?(en?'Active':'Activo'):(en?'Your plan':'Tu plan')}</span><h2>{planName(active?user?.plan:'free')}</h2><p>{active?(cancelled?(en?'Access until ':'Acceso hasta el '):(en?'Next renewal: ':'Próxima renovación: '))+date:(en?'Build your daily study habit with free practice.':'Crea tu hábito de estudio con práctica diaria gratuita.')}</p><p className="subscription-terms">{en?'Monthly subscription. Cancel renewal at any time and keep access until your paid period ends.':'Suscripción mensual. Puedes cancelar la renovación cuando quieras y conservarás el acceso hasta el vencimiento del período pagado.'}</p></div>
    <div className="subscription-actions">{checking&&<span className="subscription-check" role="status">{en?'Updating subscription…':'Actualizando suscripción…'}</span>}{subscription?.approvalUrl&&<button onClick={resume} disabled={busy}>{en?'Continue payment':'Continuar pago'}</button>}{subscription&&!cancelled&&<button className="plan-secondary" disabled={busy} onClick={()=>setCheckout({phase:'cancel'})}>{subscription.approvalUrl?(en?'Cancel request':'Cancelar solicitud'):(en?'Cancel renewal':'Cancelar renovación')}</button>}<button className="plan-link" disabled={checking||busy} onClick={()=>checkPayment().catch(err=>setMessage(err.message))}>{en?'Refresh status':'Actualizar estado'}</button></div>
   </section>
   {message&&<p className="subscription-notice" role="status">{message}</p>}
   {loadError?<div role="alert"><p>{loadError}</p><button onClick={()=>{setLoading(true);setLoadError('');setRevision(v=>v+1);}}>{en?'Retry':'Reintentar'}</button></div>:<div className="home-grid subscription-plans">{plans.map(plan=>{
    const current=plan.id===(active?user?.plan:'free'),locked=!!subscription&&(active||!cancelled)&&!subscription.approvalUrl&&!current;
    return <section className={`home-panel plan-card plan-card--${plan.id} ${plan.popular?'plan-card--featured':''}`} key={plan.id}>
     <div className="plan-card-top"><span className="plan-card-icon" aria-hidden="true">{plan.id==='free'?'✦':plan.id==='uni'?'◎':'✧'}</span>{plan.popular&&<span className="plan-badge">{en?'Most complete':'Más completo'}</span>}</div><h2>{planName(plan.id)}</h2>
     <p className="plan-price"><strong>${plan.price.monthly.toLocaleString(en?'en-US':'es-CL')}</strong><span> CLP / {en?'month':'mes'}</span></p>
     {plan.sandboxPrice&&<p className="plan-paypal-price">{en?'PayPal payment':'Pago en PayPal'}: <strong>US$ {plan.sandboxPrice.amount} / {en?'month':'mes'}</strong></p>}
     <ul className="plan-features"><li>{plan.id==='free'?(en?'Up to 20 questions a day':'Hasta 20 preguntas al día'):plan.id==='uni'?(en?'Unlimited practice in your chosen test':'Práctica ilimitada en la prueba que elijas'):(en?'Unlimited practice in every PAES test':'Práctica ilimitada en todas las pruebas PAES')}</li><li>{en?'Progress and study plan':'Progreso y plan de estudio'}</li>{plan.id==='all'&&<li>{en?'Tutors and weakness analysis':'Tutores y análisis de debilidades'}</li>}</ul>
     {plan.id==='uni'&&<label className="plan-test">{en?'Choose your test':'Elige tu prueba'}<select value={testId} disabled={busy||current} onChange={e=>setTestId(e.target.value)}>{TESTS.map(([id,es,english])=><option key={id} value={id}>{en?english:es}</option>)}</select></label>}
     <button disabled={busy||current||plan.id==='free'||locked||!['simulation','paypal-sandbox'].includes(plan.paymentMode)} onClick={()=>choose(plan.id)}>{current?(en?'Current plan':'Plan actual'):locked?(en?'Available after your current plan':'Disponible al finalizar tu plan'):(en?'Subscribe with PayPal':'Suscribirme con PayPal')}</button>
    </section>;
   })}</div>}
   <p className="plan-footnote">{en?'Fixed-order mock exams are included in Full access.':'Facsímil en orden fijo, incluido en Acceso completo.'}</p>
  </>}
  {checkout&&<dialog ref={dialog} className="checkout-dialog" onCancel={event=>{event.preventDefault();if(!busy)closeCheckout();}} aria-labelledby="checkout-title">
   <div className={`checkout-symbol ${checkout.phase==='confirmed'?'is-confirmed':''}`} aria-hidden="true"><ApruebaIcon name={checkout.phase==='confirmed'?'check':checkout.phase==='cancel'?'cross':'card'} size={30} /></div>
   <h2 id="checkout-title">{checkout.phase==='confirmed'?(en?'Your plan is ready':'Tu plan está listo'):checkout.phase==='cancel'?(en?'Cancel renewal?':'¿Cancelar la renovación?'):checkout.phase==='error'?(en?'We could not continue':'No pudimos continuar'):(en?'Complete your subscription':'Completa tu suscripción')}</h2>
   {waiting?<><p>{checkout.phase==='opening'?(en?'Preparing your secure payment…':'Preparando tu pago seguro…'):(en?'Complete payment in the PayPal window. Your plan will update here automatically.':'Completa el pago en la ventana de PayPal. Tu plan se actualizará aquí automáticamente.')}</p><div className="checkout-progress" role="status" aria-label={en?'Waiting for payment confirmation':'Esperando confirmación del pago'}><span/></div>{checkout.approvalUrl&&<button onClick={()=>window.apruebaCheckout?.open(checkout.approvalUrl)}>{checkout.blocked?(en?'Open PayPal window':'Abrir ventana de PayPal'):(en?'Show PayPal window':'Mostrar ventana de PayPal')}</button>}</>:checkout.phase==='confirmed'?<p>{en?'Payment confirmed. Your subscription benefits are now available.':'Pago confirmado. Ya puedes disfrutar de los beneficios de tu suscripción.'}</p>:checkout.phase==='cancel'?<><p>{active?(en?`There will be no further renewals. You keep access until ${date}.`:`No habrá nuevas renovaciones. Mantendrás el acceso hasta el ${date}.`):(en?'Your pending payment request will be cancelled.':'Se cancelará tu solicitud de pago pendiente.')}</p><button disabled={busy} onClick={cancel}>{busy?(en?'Cancelling…':'Cancelando…'):(en?'Confirm cancellation':'Confirmar cancelación')}</button></>:<p role={checkout.phase==='error'?'alert':'status'}>{checkout.error||(en?'Confirmation is taking longer than expected. You can close this panel and check your subscription status later.':'La confirmación está tardando más de lo esperado. Puedes cerrar este panel y consultar el estado de tu suscripción más tarde.')}</p>}
   <button className="plan-secondary" disabled={busy} onClick={closeCheckout}>{checkout.phase==='confirmed'?(en?'Continue studying':'Continuar estudiando'):checkout.phase==='cancel'?(en?'Keep subscription':'Mantener suscripción'):(en?'Close panel':'Cerrar panel')}</button>
  </dialog>}
 </div>;
}
