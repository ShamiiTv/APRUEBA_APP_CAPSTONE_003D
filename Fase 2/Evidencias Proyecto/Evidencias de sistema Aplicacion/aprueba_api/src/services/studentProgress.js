import { loadSharedBank } from './sharedBank.js';
import { db } from '../config/firebase.js';
import { summarizeProgress } from './progress.js';

export async function loadStudentProgress(uid) {
  const ref = db.collection('users').doc(uid);
  const [user, history, questions] = await Promise.all([ref.get(), ref.collection('answeredQuestions').get(), loadSharedBank()]);
  if (!user.exists) throw Object.assign(new Error('Estudiante no encontrado'), { status:404, code:'USER_NOT_FOUND' });
  return { user:user.data(), progress:summarizeProgress(user.data(), history.docs.map(d => ({ ...d.data(),id:d.id })), questions.map(d => ({ ...d.question,id:d.id }))) };
}
