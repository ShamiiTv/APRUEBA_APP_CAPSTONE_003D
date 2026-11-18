import { db } from '../config/firebase.js';
import { fields, requestId, checkOperation, text, problem, fail, ok } from '../services/social.js';
import { dailyQuota } from '../services/practice.js';

// Perfiles ficticios: nunca se presentan como docentes contratados o verificados.
const base = { mode: 'Online · Presencial', simulated: true, verified: false };
const CATALOG = [
  {
    ...base, id: 'demo-m1', name: 'María Valdés', subjectTestId: 'm1',
    subjectLabel: 'Matemática M1·M2', specialty: 'Álgebra y funciones',
    bio: 'Perfil ficticio. Prepara PAES Matemática con foco en álgebra y funciones. Método paso a paso y ensayos cronometrados.',
    hourlyRate: 12000, rating: 4.9, reviewsCount: 128, experienceYears: 5, avatarColor: '#1A365D',
    criteria: { didactics: 4.9, punctuality: 4.8, mastery: 5.0 },
    featuredReview: { author: 'Camila R.', text: 'Explica increíble, subí 120 puntos en el ensayo. Muy puntual.' },
  },
  {
    ...base, id: 'demo-m2', name: 'Camila Rojas', subjectTestId: 'm2',
    subjectLabel: 'Matemática M2', mode: 'Online', specialty: 'Funciones y probabilidad',
    bio: 'Perfil ficticio. Refuerzo de M2 con ejercicios graduados y resolución comentada.',
    hourlyRate: 13000, rating: 4.7, reviewsCount: 63, experienceYears: 4, avatarColor: '#6366F1',
    criteria: { didactics: 4.7, punctuality: 4.6, mastery: 4.9 },
    featuredReview: { author: 'Tomás P.', text: 'Me ayudó a entender probabilidades de una vez.' },
  },
  {
    ...base, id: 'demo-lectora', name: 'Rodrigo Cea', subjectTestId: 'lectora',
    subjectLabel: 'Comp. Lectora', mode: 'Online', specialty: 'Comprensión de textos',
    bio: 'Perfil ficticio. Estrategias de inferencia e interpretación de textos para la PAES.',
    hourlyRate: 10000, rating: 4.7, reviewsCount: 86, experienceYears: 6, avatarColor: '#10B981',
    criteria: { didactics: 4.8, punctuality: 4.6, mastery: 4.7 },
    featuredReview: { author: 'Javiera M.', text: 'Aprendí a leer más rápido y a no caer en las alternativas trampa.' },
  },
  {
    ...base, id: 'demo-cien', name: 'Paula Soto', subjectTestId: 'cien',
    subjectLabel: 'Ciencias · Biología', mode: 'Presencial', specialty: 'Biología celular',
    bio: 'Perfil ficticio. Biología y módulo común con apoyo de esquemas y repaso guiado.',
    hourlyRate: 11000, rating: 4.8, reviewsCount: 54, experienceYears: 3, avatarColor: '#6366F1',
    criteria: { didactics: 4.8, punctuality: 4.7, mastery: 4.8 },
    featuredReview: { author: 'Diego A.', text: 'Muy clara con los esquemas, ahora sí entiendo genética.' },
  },
  {
    ...base, id: 'demo-hist', name: 'Javier Fuentes', subjectTestId: 'hist',
    subjectLabel: 'Historia y C. Soc.', mode: 'Online', specialty: 'Formación ciudadana',
    bio: 'Perfil ficticio. Historia de Chile y formación ciudadana con líneas de tiempo y casos.',
    hourlyRate: 9500, rating: 4.6, reviewsCount: 41, experienceYears: 4, avatarColor: '#F5AF41',
    criteria: { didactics: 4.6, punctuality: 4.5, mastery: 4.7 },
    featuredReview: { author: 'Fernanda L.', text: 'Las líneas de tiempo me salvaron el ensayo de historia.' },
  },
];

const ENGLISH_CATALOG={"demo-m1": {"subjectLabel": "Mathematics M1–M2", "specialty": "Algebra and functions", "bio": "PAES mathematics preparation focused on algebra and functions, with step-by-step practice and timed exercises.", "mode": "Online · In person", "review": "Clear explanations helped me improve my practice results. Always on time."}, "demo-m2": {"subjectLabel": "Mathematics M2", "specialty": "Functions and probability", "bio": "Strengthen your M2 skills with progressively challenging exercises and guided solutions.", "mode": "Online", "review": "She helped me finally understand probability."}, "demo-lectora": {"subjectLabel": "Reading Comprehension", "specialty": "Text comprehension", "bio": "Inference and interpretation strategies for the PAES reading comprehension test.", "mode": "Online", "review": "I learned to read more efficiently and identify misleading alternatives."}, "demo-cien": {"subjectLabel": "Science · Biology", "specialty": "Cell biology", "bio": "Biology and core science preparation using diagrams and guided review.", "mode": "In person", "review": "The diagrams made genetics much easier to understand."}, "demo-hist": {"subjectLabel": "History and Social Sciences", "specialty": "Citizenship education", "bio": "Chilean history and citizenship education through timelines and practical cases.", "mode": "Online", "review": "The timelines really helped me prepare for the history test."}};

export async function getTutors(req, res) {
  return ok(res, CATALOG.filter(tutor => !req.query.testId || req.query.testId === 'all' || tutor.subjectTestId === req.query.testId).map(tutor=>{const localized=req.query.locale==='en'?ENGLISH_CATALOG[tutor.id]:null;return {...tutor,locale:req.query.locale==='en'?'en':'es',...(localized?{subjectLabel:localized.subjectLabel,specialty:localized.specialty,bio:localized.bio,mode:localized.mode,featuredReview:{...tutor.featuredReview,text:localized.review}}:{bio:tutor.bio.replace('Perfil ficticio. ','')})};}), { simulated: true });
}

export async function requestTutorSession(req, res) {
  try {
    fields(req.body, ['tutorId', 'topic', 'message', 'requestId']);
    const id = requestId(req.body), uid = req.user.sub, tutor = CATALOG.find(item => item.id === req.body.tutorId);
    const userDoc = await db.collection('users').doc(uid).get();
    if (!dailyQuota(userDoc.data() || {}).unlimited) {
      throw Object.assign(problem('Contactar profesores requiere el plan Todas las pruebas', 403), { code: 'PREMIUM_REQUIRED' });
    }
    if (!tutor) throw problem('Tutor no disponible', 404);
    const topic = text(req.body.topic || 'Refuerzo', 150), message = text(req.body.message, 2000);
    const signature = JSON.stringify([tutor.id, topic, message]);
    const ref = db.collection('users').doc(uid).collection('tutorRequests').doc(id);
    const result = await db.runTransaction(async tx => {
      const previous = await tx.get(ref);
      if (checkOperation(previous, signature)) return { id, status: 'simulated', simulated: true, replayed: true };
      tx.set(ref, { signature, tutorId: tutor.id, tutorName: tutor.name, topic, message, status: 'simulated', simulated: true, createdAt: new Date() });
      return { id, status: 'simulated', simulated: true, replayed: false };
    });
    return ok(res, result, null, result.replayed ? 200 : 201);
  } catch (error) { return fail(res, error); }
}