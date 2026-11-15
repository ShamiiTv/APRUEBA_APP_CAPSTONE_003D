import { db } from '../config/firebase.js';
import { fields, requestId, checkOperation, text, problem, fail, ok } from '../services/social.js';

// Perfiles ficticios: nunca se presentan como docentes contratados o verificados.
const CATALOG=[['m1','Matemática M1','Álgebra y números'],['m2','Matemática M2','Funciones y probabilidad'],['lectora','Competencia Lectora','Comprensión de textos'],['cien','Ciencias','Biología'],['hist','Historia','Formación ciudadana']].map(([subjectTestId,subjectLabel,specialty],index)=>({id:`demo-${subjectTestId}`,name:`Tutor de demostración ${index+1}`,subjectTestId,subjectLabel,specialty,bio:'Perfil ficticio para probar el flujo de tutorías.',mode:'online',hourlyRate:0,avatarColor:'#1A365D',simulated:true,verified:false}));
export async function getTutors(req,res) {
  return ok(res,CATALOG.filter(tutor=>!req.query.testId || req.query.testId==='all' || tutor.subjectTestId===req.query.testId),{simulated:true});
}
export async function requestTutorSession(req,res) {
  try {
    fields(req.body,['tutorId','topic','message','requestId']);
    const id=requestId(req.body),uid=req.user.sub,tutor=CATALOG.find(item=>item.id===req.body.tutorId);
    if (!tutor) throw problem('Tutor no disponible',404);
    const topic=text(req.body.topic || 'Refuerzo',150),message=text(req.body.message,2000);
    const signature=JSON.stringify([tutor.id,topic,message]);
    const ref=db.collection('users').doc(uid).collection('tutorRequests').doc(id);
    const result=await db.runTransaction(async tx=>{
      const previous=await tx.get(ref);
      if (checkOperation(previous,signature)) return {id,status:'simulated',simulated:true,replayed:true};
      tx.set(ref,{signature,tutorId:tutor.id,tutorName:tutor.name,topic,message,status:'simulated',simulated:true,createdAt:new Date()});
      return {id,status:'simulated',simulated:true,replayed:false};
    });
    return ok(res,result,null,result.replayed?200:201);
  } catch(error) {return fail(res,error);}
}
