import { loadStudentProgress } from '../services/studentProgress.js';

export async function getProgress(req, res) {
  try {
    const { progress:data } = await loadStudentProgress(req.user.sub);
    return res.json({ data, error: null, meta: { timezone: 'America/Santiago' } });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ data:null,error:{ code:error.code,message:error.message },meta:null });
    return res.status(503).json({ data: null, error: { code: 'PROGRESS_UNAVAILABLE', message: 'No se pudo cargar tu progreso. Intenta nuevamente.' }, meta: null });
  }
}
