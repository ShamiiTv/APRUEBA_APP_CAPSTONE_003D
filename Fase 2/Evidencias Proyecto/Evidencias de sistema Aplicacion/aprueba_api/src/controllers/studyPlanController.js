import { db } from '../config/firebase.js';
import { loadStudentProgress } from '../services/studentProgress.js';
import { buildStudyPlan, validateStudyPlan } from '../services/studyPlan.js';

const fail = (res,error) => res.status(error.status || 503).json({ data:null,error:{ code:error.code || 'STUDY_PLAN_UNAVAILABLE',message:error.status ? error.message : 'No se pudo cargar tu plan de estudio. Intenta nuevamente.' },meta:null });
export async function getStudyPlan(req,res) {
  try {
    const { user,progress } = await loadStudentProgress(req.user.sub);
    return res.json({ data:buildStudyPlan(user,progress),error:null,meta:{ timezone:'America/Santiago' } });
  } catch(error) { return fail(res,error); }
}
export async function saveStudyPlan(req,res) {
  if (!validateStudyPlan(req.body)) return fail(res,{ status:400,code:'BAD_REQUEST',message:'Elige al menos una prueba y una meta de entre 1 y 20 preguntas diarias.' });
  try {
    const settings = { dailyGoal:req.body.dailyGoal,testIds:[...req.body.testIds] };
    const ref = db.collection('users').doc(req.user.sub);
    await db.runTransaction(async transaction => {
      const user = await transaction.get(ref);
      if (!user.exists) throw Object.assign(new Error('Estudiante no encontrado'),{ status:404,code:'USER_NOT_FOUND' });
      transaction.update(ref,{ studyPlan:settings,updatedAt:new Date() });
    });
    return res.json({ data:{ settings },error:null,meta:null });
  } catch(error) { return fail(res,error); }
}
