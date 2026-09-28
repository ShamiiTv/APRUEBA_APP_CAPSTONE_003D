import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/firebase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Carpeta relativa dentro del repositorio donde residen los 33 JSONs
const QUESTIONS_DIR = resolve(__dirname, 'questions');

// Catálogo oficial de pruebas (tests)
const testsCatalog = [
  { id: 'lectora', label: 'Competencia Lectora', color: '#1A365D', axes: ['Vocabulario', 'Comprensión', 'Evaluación'], order: 1, active: true },
  { id: 'm1', label: 'Matemática M1', color: '#10B981', axes: ['Álgebra y Funciones', 'Números', 'Geometría', 'Probabilidad y Estadística'], order: 2, active: true },
  { id: 'm2', label: 'Matemática M2', color: '#6366F1', axes: ['Álgebra Avanzada', 'Cálculo y Límites', 'Vectores y Complejos'], order: 3, active: true },
  { id: 'cien', label: 'Ciencias (Biología)', color: '#F5B041', axes: ['Célula y Ciclo Celular', 'Organización y Sistemas', 'Ecosistemas'], order: 4, active: true },
];

// Asignación de testId y eje temático según el nombre del archivo
function mapFileMetadata(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('biologia')) {
    return { testId: 'cien', axis: 'Biología Celular y Ecosistemas' };
  }
  if (lower.includes('matematica')) {
    return { testId: 'm1', axis: 'Álgebra, Números y Geometría' };
  }
  if (lower.includes('verbal')) {
    return { testId: 'lectora', axis: 'Comprensión Lectora y Vocabulario' };
  }
  return { testId: 'm1', axis: 'General' };
}

// Mapeo al modelo documental de Firestore especificado por la empresa
function formatQuestionDoc(raw, testId, axis) {
  return {
    testId,
    axis,
    skillId: `sk_${testId}_general`,
    difficulty: 'd2',
    statement: raw.pregunta || raw.statement || '',
    options: raw.alternativas || raw.options || [],
    correctAnswer: raw.respuesta_correcta || raw.correctAnswer || 'A',
    explanation: {
      title: 'Resolución oficial',
      subject: testId,
      steps: [raw.explicacion_respuesta || 'Revisión paso a paso del ejercicio.'],
      verification: 'Comprobación de alternativa correcta según temario oficial.',
      keyConcept: raw.habilidad_requerida || 'Concepto clave PAES'
    },
    requiredSkillText: raw.habilidad_requerida || '',
    status: 'published',
    flagCount: 0,
    randomKey: Math.random(),
    stats: {
      timesAnswered: 0,
      timesCorrect: 0,
      sumElapsedMs: 0,
      elapsedBuckets: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function seed() {
  console.log('--- 1. Sembrando catálogo oficial de pruebas (tests) ---');
  for (const t of testsCatalog) {
    await db.collection('tests').doc(t.id).set(t);
  }
  console.log(`Catálogo de pruebas sembrado (${testsCatalog.length} pruebas).`);

  console.log(`\n--- 2. Procesando banco de preguntas desde: ${QUESTIONS_DIR} ---`);
  
  let files = [];
  try {
    files = readdirSync(QUESTIONS_DIR).filter(f => f.toLowerCase().endsWith('.json'));
  } catch (err) {
    console.error(`Error al acceder al directorio de preguntas: ${err.message}`);
    process.exit(1);
  }

  console.log(`Archivos detectados: ${files.length}`);
  let totalImported = 0;

  for (const file of files) {
    const filePath = resolve(QUESTIONS_DIR, file);
    const { testId, axis } = mapFileMetadata(file);

    try {
      const content = readFileSync(filePath, 'utf-8');
      const questions = JSON.parse(content);

      if (!Array.isArray(questions)) continue;

      // Inserción en bloques (batches) de hasta 400 documentos para no superar límites de Firestore
      const chunkSize = 400;
      for (let i = 0; i < questions.length; i += chunkSize) {
        const batch = db.batch();
        const slice = questions.slice(i, i + chunkSize);

        for (const item of slice) {
          if (!item.pregunta && !item.statement) continue;
          const ref = db.collection('questions').doc();
          batch.set(ref, formatQuestionDoc(item, testId, axis));
          totalImported++;
        }

        await batch.commit();
      }

      console.log(`✔ [${testId}] ${file} (${questions.length} preguntas procesadas)`);
    } catch (err) {
      console.warn(`✖ Falló la carga del archivo ${file}:`, err.message);
    }
  }

  console.log(`\n=== Proceso finalizado ===`);
  console.log(`Total de preguntas cargadas en Firestore: ${totalImported}`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Error general durante la ejecución del seed:', err);
  process.exit(1);
});