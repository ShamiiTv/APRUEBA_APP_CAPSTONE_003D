import { db } from '../config/firebase.js';
import { balances } from '../services/medals.js';
import { practiceDate } from '../services/practice.js';
import { fields, identifier, requestId, checkOperation, problem, fail, ok } from '../services/social.js';

const day = user => ({date:practiceDate(),used:user.giftsDaily?.date===practiceDate() ? user.giftsDaily.used || 0 : 0,max:10});
export async function getGifts(req,res) {
  try {
    const uid=req.user.sub,ref=db.collection('users').doc(uid);
    const [user,groups]=await Promise.all([ref.get(),db.collection('groups').where('memberIds','array-contains',uid).get()]);
    if (!user.exists) throw problem('Usuario no encontrado',404);
    const ids=[...new Set(groups.docs.filter(doc=>!doc.data().archived).flatMap(doc=>doc.data().memberIds || []))].filter(id=>id!==uid);
    const friends=[];
    for (let start=0;start<ids.length;start+=100) {
      const docs=await db.getAll(...ids.slice(start,start+100).map(id=>db.collection('users').doc(id)));
      friends.push(...docs.filter(doc=>doc.exists).map(doc=>({userId:doc.id,name:doc.data().name || 'Estudiante',giftedToday:0})));
    }
    return ok(res,{daily:day(user.data()),bronzeAvailable:balances(user.data().medals).bronze,friends});
  } catch(error) {return fail(res,error);}
}
export async function sendGifts(req,res) {
  try {
    fields(req.body,['recipients','requestId']);
    const id=requestId(req.body),uid=req.user.sub;
    if (!Array.isArray(req.body.recipients) || !req.body.recipients.length || req.body.recipients.length>10) throw problem('Selecciona entre 1 y 10 destinatarios');
    const recipients=req.body.recipients.map(recipient=>{
      fields(recipient,['userId','amount']);
      const userId=identifier(recipient.userId);
      if (userId===uid || !Number.isInteger(recipient.amount) || recipient.amount<1 || recipient.amount>10) throw problem('Destinatario o cantidad inválidos');
      return {userId,amount:recipient.amount};
    }).sort((a,b)=>a.userId.localeCompare(b.userId));
    if (new Set(recipients.map(recipient=>recipient.userId)).size!==recipients.length) throw problem('No repitas destinatarios');
    const amount=recipients.reduce((sum,recipient)=>sum+recipient.amount,0);
    if (amount>10) throw problem('Puedes regalar como máximo 10 bronces al día');
    const ref=db.collection('users').doc(uid),op=ref.collection('medalOperations').doc(id),signature=JSON.stringify(['gift',recipients]);
    const result=await db.runTransaction(async tx=>{
      const [user,previous,groups]=await Promise.all([tx.get(ref),tx.get(op),tx.get(db.collection('groups').where('memberIds','array-contains',uid))]);
      if (!user.exists) throw problem('Usuario no encontrado',404);
      if (checkOperation(previous,signature)) return {sent:amount,replayed:true};
      const friends=new Set(groups.docs.filter(doc=>!doc.data().archived).flatMap(doc=>doc.data().memberIds || []));
      if (recipients.some(recipient=>!friends.has(recipient.userId))) throw problem('Solo puedes regalar a integrantes de tus grupos',403);
      const docs=await tx.getAll(...recipients.map(recipient=>db.collection('users').doc(recipient.userId)));
      const daily=day(user.data()),medals=balances(user.data().medals);
      if (daily.used+amount>10 || medals.bronze<amount) throw problem('Saldo o límite diario insuficiente',409);
      const recipientBalances=docs.map(doc=>{if(!doc.exists)throw problem('Destinatario no disponible',404);return balances(doc.data().medals);});
      recipientBalances.forEach((balance,index)=>{if(!Number.isSafeInteger(balance.bronze+recipients[index].amount))throw problem('Saldo fuera de límite',409);});
      const now=new Date();
      medals.bronze-=amount;
      tx.update(ref,{medals,giftsDaily:{date:daily.date,used:daily.used+amount},updatedAt:now});
      docs.forEach((doc,index)=>{
        const recipient=recipients[index],balance=recipientBalances[index];balance.bronze+=recipient.amount;
        tx.update(doc.ref,{medals:balance,updatedAt:now});
        tx.set(doc.ref.collection('medalLedger').doc(`gift-${uid}-${id}`),{event:'gift_received',tier:'bronze',amount:recipient.amount,reason:'Regalo de un integrante de tu grupo',createdAt:now});
      });
      tx.set(ref.collection('medalLedger').doc(`gift-${id}`),{event:'gift_sent',tier:'bronze',amount:-amount,reason:'Regalo a integrantes de tus grupos',createdAt:now});
      tx.set(op,{signature,type:'gift',createdAt:now});
      return {sent:amount,replayed:false};
    });
    return ok(res,result);
  } catch(error) {return fail(res,error);}
}
