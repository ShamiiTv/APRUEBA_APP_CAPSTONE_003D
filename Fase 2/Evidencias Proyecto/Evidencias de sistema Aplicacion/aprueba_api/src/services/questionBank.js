import { createHash } from 'node:crypto';

export const BANK_VERSION = 2;
// En matemáticas A y a pueden representar variables distintas.
export const normalize = text => text.normalize('NFC').trim().replace(/\s+/gu, ' ');

export function contentId(question) {
  const options = question.options.map(option => normalize(typeof option === 'string' ? option : option.text));
  return `q_${createHash('sha256').update(JSON.stringify([question.testId, normalize(question.statement), options.sort()])).digest('hex')}`;
}

export function optionsOf(question) {
  return question.options.map((option, index) => typeof option === 'string' ? { id: 'ABCDE'[index], text: option } : option);
}

export function validQuestion(question) {
  if (typeof question.statement !== 'string' || !question.statement.trim() || !Array.isArray(question.options) || question.options.length < 4 || question.options.length > 5) return false;
  const options = optionsOf(question);
  if (options.some(o => !o || typeof o.text !== 'string' || !o.text.trim() || !/^[A-E]$/.test(o.id))) return false;
  return new Set(options.map(o => normalize(o.text))).size === options.length && new Set(options.map(o => o.id)).size === options.length && options.some(o => o.id === question.correctAnswer);
}

export function canPractice(question) {
  return question.bankVersion === BANK_VERSION && question.status === 'published' && validQuestion(question);
}

export function mapFileMetadata(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('biologia')) return { testId: 'cien', axis: 'Biología' };
  if (lower.includes('matematica')) return { testId: 'm1', axis: 'Matemática' };
  if (lower.includes('verbal')) return { testId: 'lectora', axis: 'Competencia Lectora' };
  throw new Error(`No se puede identificar la prueba de ${filename}`);
}

export function formatQuestion(raw, metadata, source) {
  const testId = raw.prueba || metadata.testId;
  if (!['m1', 'm2', 'lectora', 'cien', 'hist'].includes(testId)) throw new Error(`Prueba inválida: ${source.file} #${source.index}`);
  const question = {
    ...metadata, testId, statement: raw.pregunta, options: raw.alternativas,
    correctAnswer: raw.respuesta_correcta,
    difficulty: raw.dificultad || 'd2', skillId: `sk_${testId}_general`,
    explanation: { title: 'Explicación', steps: [raw.explicacion_respuesta], keyConcept: raw.habilidad_requerida },
    bankVersion: BANK_VERSION, source,
    // All ready supplier questions are included; editorial-use metadata does not exclude them.
    status: raw.estado_revision !== 'lista' ? 'pending_review' : 'published',
    pedagogicalUse: raw.uso_pedagogico || 'practica',
    contentReview: raw.revision_contenido || null,
    reviewReasons: raw.motivos_revision || [],
  };
  if (question.status === 'published' && !validQuestion(question)) throw new Error(`Pregunta publicada inválida: ${source.file} #${source.index}`);
  question.contentId = contentId(question);
  return question;
}
