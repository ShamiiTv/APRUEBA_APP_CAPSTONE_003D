import {createHash} from 'node:crypto';
import {db} from '../config/firebase.js';
import {dailyQuota} from './practice.js';
import {profileView} from './profileView.js';
import {problem,requestId,fields} from './social.js';
import {paypalRequest,paypalCatalog,paypalEnabled,sandboxApprovalUrl,paidPeriod} from './paypalSandbox.js';

const userRef=uid=>db.collection('users').doc(uid);
const subscriptionRef=id=>db.collection('paypalSandboxSubscriptions').doc(id);
const safeUser=snapshot=>({uid:snapshot.id,...profileView(snapshot.data()),quota:dailyQuota(snapshot.data())});
const view=r=>r?{id:r.id,status:r.status,planId:r.planId,testId:r.testId,approvalUrl:r.status==='APPROVAL_PENDING'?r.approvalUrl:null,currency:r.currency,amount:r.amount,cancelled:r.status==='CANCELLED'}:null;
const ensure=()=>{if(!paypalEnabled())throw problem('Los pagos todavía no están disponibles',503);};

export async function startPaypalPlan(uid,body) {
  ensure();fields(body,['planId','testId','requestId','billingCycle']);
  const {planId,testId=null,billingCycle='monthly'}=body,id=requestId(body);
  if(!['uni','all'].includes(planId)||billingCycle!=='monthly'||(planId==='uni'&&!['m1','m2','lectora','cien','hist'].includes(testId))||(planId==='all'&&testId!==null))throw problem('Selecciona un plan mensual y su prueba',400);
  const catalog=paypalCatalog()[planId];
  if(!catalog.providerPlanId)throw problem('Los planes todavía no están disponibles',503);
  const signature=JSON.stringify([planId,testId]);
  const reservation=await db.runTransaction(async tx=>{
    const u=await tx.get(userRef(uid));if(!u.exists)throw problem('Usuario no encontrado',404);
    if(u.data().paypalSubscriptionId){
      const existing=await tx.get(subscriptionRef(u.data().paypalSubscriptionId));
      if(!['CANCELLED','EXPIRED'].includes(existing.data()?.status))return {subscriptionId:u.data().paypalSubscriptionId};
      const periodEnd=u.data().currentPeriodEnd?.toDate?.();
      if(u.data().paymentMode==='paypal-sandbox' && periodEnd>new Date())throw problem('Conservas acceso hasta el fin del período. Espera su vencimiento para contratar otro plan.',409);
    }
    const pending=u.data().paypalPendingRequest;
    if(pending && (pending.id!==id||pending.signature!==signature))throw problem('Hay un pago pendiente. Reintenta la selección original.',409);
    if(pending && Date.now()-pending.createdAt.toMillis()>60*60*60*1000)throw problem('El pago pendiente requiere revisión. Contacta con soporte.',409);
    if(!pending)tx.update(u.ref,{paypalPendingRequest:{id,signature,createdAt:new Date()}});
    return {};
  });
  if(reservation.subscriptionId){const r=await subscriptionRef(reservation.subscriptionId).get();if(r.data()?.planId!==planId||r.data()?.testId!==testId)throw problem('Cancela primero la suscripción existente antes de elegir otro plan.',409);return {subscription:view(r.data()),sandbox:true};}
  const origin=process.env.PAYPAL_RETURN_ORIGIN||'https://aprueba.shamiiplay.com';
  const returnUrl=new URL('/paypal-return.html?result=return',origin),cancelUrl=new URL('/paypal-return.html?result=cancel',origin);
  if(returnUrl.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(returnUrl.hostname))throw problem('URL de retorno no configurada',503);
  const remote=await paypalRequest('/v1/billing/subscriptions',{method:'POST',requestId:createHash('sha256').update(`${uid}:${id}`).digest('hex').slice(0,32),body:{plan_id:catalog.providerPlanId,custom_id:uid,application_context:{brand_name:'Aprueba',user_action:'SUBSCRIBE_NOW',shipping_preference:'NO_SHIPPING',return_url:returnUrl.href,cancel_url:cancelUrl.href}}});
  const approvalUrl=sandboxApprovalUrl(remote.links?.find(l=>l.rel==='approve')?.href);
  if(!/^I-[A-Z0-9]+$/.test(remote.id)||!approvalUrl)throw problem('No se pudo abrir PayPal',503);
  const record={id:remote.id,uid,planId,testId,...catalog,status:remote.status,approvalUrl,createdAt:new Date()};
  await db.runTransaction(async tx=>{
    const u=await tx.get(userRef(uid));if(!u.exists)throw problem('Usuario no encontrado',404);
    if(u.data().paypalPendingRequest?.id!==id)throw problem('La operación cambió. Reintenta.',409);
    tx.set(subscriptionRef(record.id),record);tx.update(u.ref,{paypalSubscriptionId:record.id,paypalPendingRequest:null});
  });
  return {subscription:view(record),sandbox:true};
}

export async function syncPaypalPlan(uid) {
  ensure();const ref=userRef(uid),u=await ref.get();if(!u.exists)throw problem('Usuario no encontrado',404);
  const id=u.data().paypalSubscriptionId;
  if(!id)return {subscription:null,user:safeUser(u),sandbox:true};
  const sr=subscriptionRef(id),stored=await sr.get(),record=stored.data();
  if(!record||record.uid!==uid)throw problem('No se pudo consultar la suscripción',503);
  const remote=await paypalRequest(`/v1/billing/subscriptions/${id}`);
  const now=new Date(),start=new Date(now.getTime()-62*86400000).toISOString();
  const payments=['ACTIVE','CANCELLED','SUSPENDED','EXPIRED'].includes(remote.status)?await paypalRequest(`/v1/billing/subscriptions/${id}/transactions?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(now.toISOString())}`):{transactions:[]};
  const paid=paidPeriod(remote,payments,record,now);
  await db.runTransaction(async tx=>{
    const latest=await tx.get(ref);if(!latest.exists||latest.data().paypalSubscriptionId!==id)return;
    const patch={updatedAt:now};
    if(paid){Object.assign(patch,{plan:record.planId,subscriptionTestId:record.testId,planStatus:'active',paymentMode:'paypal-sandbox',currentPeriodEnd:paid.end});if(record.planId==='uni')patch.selectedTests=[record.testId,...(latest.data().selectedTests||[]).filter(t=>t!==record.testId)];}
    else if(latest.data().paymentMode==='paypal-sandbox')Object.assign(patch,{plan:'free',planStatus:'none',subscriptionTestId:null,currentPeriodEnd:null});
    tx.update(ref,patch);tx.update(sr,{status:remote.status,lastCheckedAt:now});
    if(paid){
      tx.set(ref.collection('paypalSandboxPayments').doc(paid.paymentId),{subscriptionId:id,planId:record.planId,amount:record.amount,currency:record.currency,paidAt:paid.start,periodEnd:paid.end,sandbox:true});
      tx.set(db.collection('paypalSandboxSales').doc(paid.paymentId),{subscriptionId:id,uid,sandbox:true});
    }
  });
  return {subscription:view({...record,status:remote.status}),user:safeUser(await ref.get()),sandbox:true};
}

export async function cancelPaypalPlan(uid) {
  ensure();const u=await userRef(uid).get();if(!u.exists)throw problem('Usuario no encontrado',404);
  const id=u.data().paypalSubscriptionId;if(!id)return {subscription:null,user:safeUser(u),sandbox:true};
  const record=(await subscriptionRef(id).get()).data();if(record?.uid!==uid)throw problem('Suscripción no encontrada',404);
  const remote=await paypalRequest(`/v1/billing/subscriptions/${id}`);
  if(remote.status==='APPROVAL_PENDING'){
    await db.runTransaction(async tx=>{
      const latest=await tx.get(userRef(uid));
      if(latest.data()?.paypalSubscriptionId!==id)throw problem('La operación cambió. Reintenta.',409);
      tx.update(subscriptionRef(id),{status:'ABANDONED',abandoned:true});
      tx.update(userRef(uid),{paypalSubscriptionId:null});
    });
    return {subscription:null,user:safeUser(await userRef(uid).get()),sandbox:true,abandoned:true};
  }
  if(!['CANCELLED','EXPIRED'].includes(remote.status))await paypalRequest(`/v1/billing/subscriptions/${id}/cancel`,{method:'POST',body:{reason:'Cancelación solicitada por el alumno en Aprueba Sandbox'}});
  const result=await syncPaypalPlan(uid);
  await subscriptionRef(id).update({status:'CANCELLED'});
  return {...result,subscription:{...result.subscription,status:'CANCELLED',approvalUrl:null,cancelled:true}};
}

export async function paypalWebhook(req,res) {
  try {
    ensure();if(!process.env.PAYPAL_WEBHOOK_ID)return res.fail('Webhook no configurado',null,503);
    const h=req.headers;
    const required=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
    if(required.some(name=>typeof h[name]!=='string'||!h[name]||h[name].length>2048))return res.fail('Firma inválida',null,400);
    let cert;try{cert=new URL(h['paypal-cert-url']);}catch{return res.fail('Firma inválida',null,400);}
    if(cert.protocol!=='https:'||!['api.sandbox.paypal.com','api-m.sandbox.paypal.com'].includes(cert.hostname)||!cert.pathname.startsWith('/v1/notifications/certs/'))return res.fail('Firma inválida',null,400);
    const verified=await paypalRequest('/v1/notifications/verify-webhook-signature',{method:'POST',body:{auth_algo:h['paypal-auth-algo'],cert_url:h['paypal-cert-url'],transmission_id:h['paypal-transmission-id'],transmission_sig:h['paypal-transmission-sig'],transmission_time:h['paypal-transmission-time'],webhook_id:process.env.PAYPAL_WEBHOOK_ID,webhook_event:req.body}});
    if(verified.verification_status!=='SUCCESS')return res.fail('Firma inválida',null,400);
    const event=req.body;
    let id=event.resource?.billing_agreement_id || (event.event_type?.startsWith('BILLING.SUBSCRIPTION.')?event.resource?.id:null);
    const saleId=event.resource?.sale_id || (event.event_type?.startsWith('PAYMENT.SALE.')?event.resource?.id:null);
    if(!id && typeof saleId==='string' && /^[A-Za-z0-9-]{1,128}$/.test(saleId))id=(await db.collection('paypalSandboxSales').doc(saleId).get()).data()?.subscriptionId;
    if(typeof id==='string'&&/^I-[A-Z0-9]+$/.test(id)){
      const r=(await subscriptionRef(id).get()).data();
      if(r){
        if(r.abandoned || !r.uid){
          const remote=await paypalRequest(`/v1/billing/subscriptions/${id}`);
          if(['ACTIVE','SUSPENDED'].includes(remote.status))await paypalRequest(`/v1/billing/subscriptions/${id}/cancel`,{method:'POST',body:{reason:'Autorizacion de prueba abandonada en Aprueba'}});
        }else{
          const u=await userRef(r.uid).get();
          if(u.exists&&u.data().paypalSubscriptionId===id)await syncPaypalPlan(r.uid);
        }
      }
    }
    return res.success({received:true});
  }catch{return res.fail('No se pudo procesar la notificación',null,503);}
}
