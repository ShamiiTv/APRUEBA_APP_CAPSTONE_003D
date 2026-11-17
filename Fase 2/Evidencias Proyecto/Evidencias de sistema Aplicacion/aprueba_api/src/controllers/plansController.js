import {profileView} from '../services/profileView.js';
import { db } from '../config/firebase.js';
import { dailyQuota } from '../services/practice.js';
import { fields, requestId, checkOperation, problem } from '../services/social.js';

export const PLANS = [
  {id:'free',name:'Plan gratuito',nameEn:'Free plan',price:{monthly:0},order:0,featureDetails:[{name:'10 base + 5 colegio + 5 dirección · 20 máximo'}]},
  {id:'uni',name:'Una prueba ilimitada',nameEn:'One unlimited test',price:{monthly:990},order:1,featureDetails:[{name:'Una prueba PAES elegida por un mes'}]},
  {id:'all',name:'Acceso completo',nameEn:'Full access',price:{monthly:4990},popular:true,order:2,featureDetails:[{name:'Todas las pruebas PAES por un mes'}]},
];
export async function getPlans(req,res) {
  return res.success(PLANS.map(plan=>({...plan,paymentMode:process.env.PAYMENTS_MODE === 'simulation' ? 'simulation' : 'unavailable'})));
}
// Modo demostración explícito, sin pasarela, tarjeta ni boletas ficticias.
export async function subscribePlan(req,res) {
  try {
    fields(req.body,['planId','testId','billingCycle','requestId']);
    const {planId,testId,billingCycle='monthly'}=req.body;
    if (!PLANS.some(plan=>plan.id===planId) || billingCycle!=='monthly' || (planId==='uni' && !['m1','m2','lectora','cien','hist'].includes(testId))) throw problem('Selecciona un plan mensual y su prueba',400);
    if (process.env.PAYMENTS_MODE!=='simulation') return res.fail('Los pagos todavía no están habilitados',null,503);
    const id=requestId(req.body),uid=req.user.sub;
    const ref=db.collection('users').doc(uid),op=ref.collection('planOperations').doc(id);
    const signature=JSON.stringify([planId,testId || null,billingCycle]);
    const result=await db.runTransaction(async tx=>{
      const [user,previous]=await Promise.all([tx.get(ref),tx.get(op)]);
      if (!user.exists) throw problem('Usuario no encontrado',404);
      if (checkOperation(previous,signature)) return {user:{uid,...profileView(user.data()),quota:dailyQuota(user.data())},simulated:true,replayed:true};
      const now=new Date(),end=new Date(now);
      const day=now.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1);
      const lastDay=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,lastDay));
      const patch={plan:planId,planStatus:planId==='free'?'none':'simulated',paymentMode:'simulation',subscriptionTestId:planId==='uni'?testId:null,currentPeriodEnd:planId==='free'?null:end,updatedAt:now};
      if(planId==='uni')patch.selectedTests=[testId,...(user.data().selectedTests || []).filter(id=>id!==testId && ['m1','m2','lectora','cien','hist'].includes(id))];
      patch.quota=dailyQuota({...user.data(),...patch});
      tx.update(ref,patch);
      tx.set(op,{signature,simulated:true,amountCharged:0,createdAt:now});
      return {user:{uid,...profileView(user.data()),...patch},simulated:true,replayed:false};
    });
    return res.success({...result,message:'Demostración: plan simulado. No se realizó ningún cobro.'});
  } catch(error) { return res.fail(error.status ? error.message : 'No se pudo simular el plan',{code:'PLAN_UNAVAILABLE'},error.status || 503); }
}
