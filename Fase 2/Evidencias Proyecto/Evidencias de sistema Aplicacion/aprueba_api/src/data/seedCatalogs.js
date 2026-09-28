import 'dotenv/config';
import { db } from '../config/firebase.js';

// 1. Catálogo de Planes (Capítulo 4 del documento)
const plans = [
  {
    id: 'free',
    name: 'Plan Gratis',
    price: { monthly: 0, yearly: 0 },
    currency: 'CLP',
    color: '#64748B',
    features: ['f1', 'f2'],
    limits: { qDay: 20, groups: 1, tests: 1 },
    popular: false,
    published: true,
    order: 1,
    updatedAt: new Date()
  },
  {
    id: 'uni',
    name: '1 Prueba Ilimitada',
    price: { monthly: 990, yearly: 9900 },
    currency: 'CLP',
    color: '#1A365D',
    features: ['f1', 'f2', 'f3'],
    limits: { qDay: 0, groups: 3, tests: 1 },
    popular: false,
    published: true,
    order: 2,
    updatedAt: new Date()
  },
  {
    id: 'all',
    name: 'Todas las Pruebas',
    price: { monthly: 4990, yearly: 49900 },
    currency: 'CLP',
    color: '#F5B041',
    features: ['f1', 'f2', 'f3', 'f4', 'f5'],
    limits: { qDay: 0, groups: 0, tests: 0 }, // 0 = ilimitado
    popular: true,
    published: true,
    order: 3,
    updatedAt: new Date()
  }
];

// 2. Catálogo de Features
const features = [
  { id: 'f1', name: '20 preguntas diarias base', icon: 'zap', order: 1 },
  { id: 'f2', name: 'Explicaciones paso a paso', icon: 'book', order: 2 },
  { id: 'f3', name: 'Preguntas ilimitadas sin tope', icon: 'infinity', order: 3 },
  { id: 'f4', name: 'Simulacros y ensayos completos', icon: 'clock', order: 4 },
  { id: 'f5', name: 'Grupos de estudio y ranking', icon: 'users', order: 5 }
];

// 3. Sponsors y Beneficios de Marca (Capítulo 4)
const sponsors = [
  {
    id: 'sp_preu_pedro',
    name: 'Preuniversitario Pedro de Valdivia',
    tier: 'Gold',
    monthlyFee: 1500000,
    benefitsOffered: 100,
    benefitsRedeemed: 12,
    status: 'ok',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const benefits = [
  {
    id: 'ben_preu_2026',
    sponsorId: 'sp_preu_pedro',
    sponsorName: 'Preuniversitario Pedro de Valdivia',
    name: '20% Descuento Arancel Anual',
    description: 'Válido para matrícula 2026 en cursos intensivos PAES.',
    costPlatinum: 5,
    stock: 50,
    redeemedCount: 0,
    active: true,
    icon: 'gift'
  }
];

// 4. Habilidades clave iniciales (skills)
const skills = [
  { id: 'sk_m1_ecuaciones', testId: 'm1', name: 'Ecuaciones e Inecuaciones de 1er Grado', axis: 'Álgebra y Funciones', level: 1, maxLevel: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: 'sk_lectora_inferencia', testId: 'lectora', name: 'Inferir e Interpretar Información', axis: 'Comprensión Lectora', level: 1, maxLevel: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: 'sk_cien_celula', testId: 'cien', name: 'Estructura y Función Celular', axis: 'Biología Celular', level: 1, maxLevel: 3, createdAt: new Date(), updatedAt: new Date() }
];

// 5. Catálogo de Tutores Oficiales PAES
const tutors = [
  {
    id: 'tut_matias_silva',
    name: 'Prof. Matías Silva',
    subjectTestId: 'm1',
    subjectLabel: 'Competencia Matemática 1 (M1)',
    university: 'Pontificia Universidad Católica de Chile',
    rating: 4.9,
    reviewsCount: 38,
    hourlyRate: 15000,
    avatarColor: '#1A365D',
    specialty: 'Álgebra, Funciones y Geometría',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'tut_valentina_concha',
    name: 'Prof. Valentina Concha',
    subjectTestId: 'lectora',
    subjectLabel: 'Competencia Lectora',
    university: 'Universidad de Chile',
    rating: 5.0,
    reviewsCount: 52,
    hourlyRate: 16000,
    avatarColor: '#F5B041',
    specialty: 'Estrategias de Inferencia e Interpretación textual',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'tut_diego_miranda',
    name: 'Prof. Diego Miranda',
    subjectTestId: 'cien',
    subjectLabel: 'Ciencias - Biología y Química',
    university: 'Universidad de Concepción',
    rating: 4.8,
    reviewsCount: 29,
    hourlyRate: 14000,
    avatarColor: '#10B981',
    specialty: 'Módulo Común y Biología Celular',
    active: true,
    createdAt: new Date()
  },
  {
    id: 'tut_carolina_herrera',
    name: 'Prof. Carolina Herrera',
    subjectTestId: 'hist',
    subjectLabel: 'Historia y Ciencias Sociales',
    university: 'Universidad de Santiago de Chile',
    rating: 4.9,
    reviewsCount: 41,
    hourlyRate: 14500,
    avatarColor: '#8B5CF6',
    specialty: 'Historia Republicana y Formación Ciudadana',
    active: true,
    createdAt: new Date()
  }
];

async function seedCatalogs() {
  console.log('Sembrando colecciones estructurales de Firestore...');

  // Sembrar plans
  for (const p of plans) {
    await db.collection('plans').doc(p.id).set(p);
  }
  console.log(`✔ Planes sembrados (${plans.length})`);

  // Sembrar features
  for (const f of features) {
    await db.collection('features').doc(f.id).set(f);
  }
  console.log(`✔ Features sembradas (${features.length})`);

  // Sembrar sponsors
  for (const s of sponsors) {
    await db.collection('sponsors').doc(s.id).set(s);
  }
  console.log(`✔ Sponsors sembrados (${sponsors.length})`);

  // Sembrar benefits
  for (const b of benefits) {
    await db.collection('benefits').doc(b.id).set(b);
  }
  console.log(`✔ Beneficios sembrados (${benefits.length})`);

  // Sembrar skills
  for (const sk of skills) {
    await db.collection('skills').doc(sk.id).set(sk);
  }
  console.log(`✔ Habilidades base sembradas (${skills.length})`);

  // Sembrar tutors
  for (const t of tutors) {
    await db.collection('tutors').doc(t.id).set(t);
  }
  console.log(`✔ Tutores oficiales sembrados (${tutors.length})`);

  console.log('Colecciones maestras inicializadas según el documento de Firestore.');
  process.exit(0);
}

seedCatalogs().catch((err) => {
  console.error('Error al sembrar catálogos:', err);
  process.exit(1);
});