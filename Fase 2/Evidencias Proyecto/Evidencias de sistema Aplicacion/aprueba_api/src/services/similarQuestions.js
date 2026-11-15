import { canPractice, contentId } from './questionBank.js';
const axis = value => typeof value === 'string' ? value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ') : '';
const ignored=new Set('para como esta este estos estas sobre entre desde hasta cuando donde cual cuales porque tambien puede puedes debe debes primero luego siguiente ejemplo ejercicios ejercicio pregunta respuesta correcta opcion alternativas habilidad requerida clase practica practicar resolver calcula calcular identifica identificar recuerda utiliza usando mediante forma paso pasos saber conocer comprender aplicar reconocer'.split(' '));
function concepts(question){
  const raw=question.explanation?.keyConcept;
  return new Set(axis(raw).split(/[^a-z]+/).filter(word=>word.length>=4&&!ignored.has(word)).map(word=>word.replace(/ciones$/,'cion').replace(/s$/,'')));
}

// Relación explícita por los metadatos del banco, sin cambiar de materia ni nivel.
export function isSimilarQuestion(source, candidate) {
  const topic=axis(source.axis);
  const sourceConcepts=concepts(source),candidateConcepts=concepts(candidate);
  return !!topic && canPractice(candidate) && candidate.testId===source.testId && candidate.difficulty===source.difficulty && axis(candidate.axis)===topic && contentId(candidate)!==contentId(source) && [...sourceConcepts].some(word=>candidateConcepts.has(word));
}
