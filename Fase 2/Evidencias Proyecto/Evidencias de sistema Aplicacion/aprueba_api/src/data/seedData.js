import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../config/firebase.js';
import { formatQuestion, mapFileMetadata, normalize, optionsOf } from '../services/questionBank.js';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), 'questions');
export function readBank() {
  const bank = new Map();
  for (const file of readdirSync(directory).filter(name => name.endsWith('.json')).sort()) {
    const questions = JSON.parse(readFileSync(resolve(directory, file), 'utf8'));
    if (!Array.isArray(questions)) throw new Error(`${file} no contiene un arreglo`);
    for (const [index, raw] of questions.entries()) {
      if (!['lista', 'pendiente'].includes(raw.estado_revision)) throw new Error(`${file} #${index + 1}: falta estado_revision`);
      const q = formatQuestion(raw, mapFileMetadata(file), { file, index: index + 1, bank: 'local-paes' });
      const prior = bank.get(q.contentId);
      if (prior) {
        const answerText = item => normalize(optionsOf(item).find(option => option.id === item.correctAnswer).text);
        if (prior.status !== 'published' || q.status !== 'published' || answerText(prior) !== answerText(q)) {
          prior.status = 'pending_review';
          prior.reviewReasons = [...new Set([...prior.reviewReasons, ...q.reviewReasons, 'Variantes con el mismo contenido requieren revisión conjunta.'])];
        }
      } else bank.set(q.contentId, q);
    }
  }
  return bank;
}

export async function seedQuestions(database = db) {
  // Validar el banco completo antes de efectuar cualquier escritura.
  const bank = readBank();
  const existing = await database.collection('questions').get();
  const byId = new Map(existing.docs.map(doc => [doc.id, doc.data()]));
  const writes = [];
  const now = new Date();
  for (const [id, question] of bank) {
    const old = byId.get(id);
    writes.push([database.collection('questions').doc(id), {
      ...question,
      updatedAt: now,
      ...(!old ? { createdAt: now, stats: { timesAnswered: 0, timesCorrect: 0, sumElapsedMs: 0 }, flagCount: 0 } : {}),
    }]);
  }
  // Conservar documentos antiguos para interpretar los historiales previos.
  // La práctica solo sirve bankVersion=2; no se borran preguntas ni respuestas.
  let archived = 0;
  for (const doc of existing.docs) {
    if (!bank.has(doc.id) && doc.data().source?.bank === 'local-paes') {
      writes.push([doc.ref, { status: 'archived', updatedAt: now }]);
      archived++;
    }
  }
  for (let index = 0; index < writes.length; index += 400) {
    const batch = database.batch();
    for (const [ref, data] of writes.slice(index, index + 400)) batch.set(ref, data, { merge: true });
    await batch.commit();
  }
  for (const [id, label] of [['lectora', 'Competencia Lectora'], ['m1', 'Matemática M1'], ['m2', 'Matemática M2'], ['cien', 'Ciencias'], ['hist', 'Historia']]) {
    const count = [...bank.values()].filter(q => q.testId === id && q.status === 'published').length;
    await database.collection('tests').doc(id).set({ label, active: count > 0, availableQuestions: count }, { merge: true });
    await database.collection('skills').doc(`sk_${id}_general`).set({ testId: id, name: `Habilidades generales de ${label}` }, { merge: true });
  }
  const summary = { unique: bank.size, published: [...bank.values()].filter(q => q.status === 'published').length, pending: [...bank.values()].filter(q => q.status === 'pending_review').length, supplementary: [...bank.values()].filter(q => q.status === 'supplementary').length, archived };
  console.log(JSON.stringify(summary));
  return summary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const action = process.argv.includes('--check') ? Promise.resolve().then(() => {
    const bank = readBank();
    console.log(JSON.stringify({ unique: bank.size, published: [...bank.values()].filter(q => q.status === 'published').length, pending: [...bank.values()].filter(q => q.status === 'pending_review').length, supplementary: [...bank.values()].filter(q => q.status === 'supplementary').length }));
  }) : seedQuestions();
  action.then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
}
