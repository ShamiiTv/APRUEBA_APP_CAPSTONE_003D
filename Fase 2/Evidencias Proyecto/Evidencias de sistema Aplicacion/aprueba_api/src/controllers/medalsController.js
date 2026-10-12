import { db } from '../config/firebase.js';
import { TIERS, balances, operation, benefitTerms, medalError } from '../services/medals.js';
const fail = (res, e) => res.status(e.status || 503).json({ data:null,error:{message:e.status ? e.message : 'No se pudo completar la operación. Intenta nuevamente.'},meta:null });
const success = (res, data) => res.json({data,error:null,meta:null});
const serialize = doc => { const d=doc.data(); return {...d,id:doc.id,createdAt:d.createdAt?.toDate?.().toISOString() || null}; };
export async function getMedalsSummary(req,res) {
  try {
    const ref=db.collection('users').doc(req.user.sub);
    const [user,ledger,redemptions]=await Promise.all([ref.get(),ref.collection('medalLedger').orderBy('createdAt','desc').limit(50).get(),ref.collection('benefitRedemptions').orderBy('createdAt','desc').limit(50).get()]);
    if (!user.exists) throw medalError('Usuario no encontrado',404);
    return success(res,{medals:balances(user.data().medals),history:ledger.docs.map(serialize),redemptions:redemptions.docs.map(serialize)});
  } catch(e) { return fail(res,e); }
}
async function transact(req,res,type) {
  try {
    const input=operation(req.body,type);
    const ref=db.collection('users').doc(req.user.sub);
    const op=ref.collection('medalOperations').doc(input.requestId);
    const data=await db.runTransaction(async tx => {
      const [user,previous]=await Promise.all([tx.get(ref),tx.get(op)]);
      if (!user.exists) throw medalError('Usuario no encontrado',404);
      const medals=balances(user.data().medals);
      if (previous.exists) {
        const saved=previous.data();
        if (saved.type!==type || saved.fromTier!==(input.fromTier || null) || saved.benefitId!==(input.benefitId || null)) throw medalError('Esta solicitud corresponde a otro canje',409);
        return {...saved.result,medals,replayed:true};
      }
      const now=new Date();
      const ledger=ref.collection('medalLedger');
      let result;
      if (type==='exchange') {
        const toTier=TIERS[TIERS.indexOf(input.fromTier)+1];
        if (medals[input.fromTier]<5) throw medalError('Necesitas al menos 5 medallas de ese nivel',409);
        if (!Number.isSafeInteger(medals[toTier]+1)) throw medalError('El saldo supera el límite permitido',409);
        medals[input.fromTier]-=5; medals[toTier]+=1;
        for (const [suffix,tier,amount] of [['out',input.fromTier,-5],['in',toTier,1]]) tx.set(ledger.doc(`${input.requestId}-${suffix}`),{event:'exchange',requestId:input.requestId,tier,amount,reason:'Canje de 5 medallas por 1 del siguiente nivel',createdAt:now});
        result={upgradedTier:toTier};
      } else {
        const benefitRef=db.collection('benefits').doc(input.benefitId);
        const snapshot=await tx.get(benefitRef);
        if (!snapshot.exists || snapshot.data().active!==true) throw medalError('El beneficio ya no está disponible',409);
        const benefit=snapshot.data();
        const {cost,stock}=benefitTerms(benefit);
        if (stock<1) throw medalError('El beneficio está agotado',409);
        if (medals.platinum<cost) throw medalError('No tienes suficientes medallas de platino',409);
        const count=benefit.redeemedCount ?? 0;
        if (!Number.isSafeInteger(count) || count<0 || !Number.isSafeInteger(count+1)) throw medalError('Contador del beneficio inválido',409);
        medals.platinum-=cost;
        const redemption={benefitId:input.benefitId,name:benefit.name || benefit.title || input.benefitId,sponsorName:benefit.sponsorName || '',description:benefit.description || '',costPlatinum:cost,status:'pending',createdAt:now};
        tx.update(benefitRef,{stock:stock-1,redeemedCount:count+1});
        tx.set(ref.collection('benefitRedemptions').doc(input.requestId),redemption);
        tx.set(ledger.doc(`${input.requestId}-benefit`),{event:'benefit',tier:'platinum',amount:-cost,reason:redemption.name,createdAt:now});
        result={redemption:{...redemption,id:input.requestId,createdAt:now.toISOString()}};
      }
      tx.update(ref,{medals,updatedAt:now});
      tx.set(op,{type,fromTier:input.fromTier || null,benefitId:input.benefitId || null,result,createdAt:now});
      return {...result,medals,replayed:false};
    });
    return success(res,data);
  } catch(e) { return fail(res,e); }
}
export const exchangeMedals=(req,res)=>transact(req,res,'exchange');
export const redeemBenefit=(req,res)=>transact(req,res,'benefit');
export async function getBenefits(req,res) {
  try {
    const snapshot=await db.collection('benefits').where('active','==',true).get();
    return success(res,snapshot.docs.map(doc=>{
      const b=doc.data(); let canRedeem=false;
      try { canRedeem=benefitTerms(b).stock>0; } catch { /* Invalid catalog entries cannot spend medals. */ }
      return {id:doc.id,name:b.name || b.title || '',sponsorName:b.sponsorName || '',description:b.description || '',costPlatinum:Number.isSafeInteger(b.costPlatinum)&&b.costPlatinum>0 ? b.costPlatinum : null,stock:Number.isSafeInteger(b.stock)&&b.stock>=0 ? b.stock : null,canRedeem};
    }));
  } catch(e) { return fail(res,e); }
}
