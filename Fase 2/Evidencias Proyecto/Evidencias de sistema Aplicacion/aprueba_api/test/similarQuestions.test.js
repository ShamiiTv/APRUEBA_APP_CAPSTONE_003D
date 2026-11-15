import test from 'node:test';
import assert from 'node:assert/strict';
import {isSimilarQuestion} from '../src/services/similarQuestions.js';
const source={testId:'m1',difficulty:'d2',axis:'Álgebra',statement:'Calcula 2 + 3',options:['1','2','3','5'],correctAnswer:'D',bankVersion:2,status:'published',explanation:{keyConcept:'Resolver ecuaciones lineales'}};
const candidate={...source,axis:' algebra ',statement:'Calcula 4 + 6',options:['10','4','6','2'],correctAnswer:'A'};
test('similares conservan prueba dificultad y eje normalizado',()=>assert.equal(isSimilarQuestion(source,candidate),true));
test('similares excluyen otros ejes materias niveles y preguntas pendientes',()=>{
  for(const patch of [{axis:'Geometría'},{testId:'m2'},{difficulty:'d1'},{status:'pending_review'},{explanation:{keyConcept:'Probabilidad condicional'}}]) assert.equal(isSimilarQuestion(source,{...candidate,...patch}),false);
});
test('similares no repiten contenido original ni agrupan ejes vacíos',()=>{
  assert.equal(isSimilarQuestion(source,{...source}),false);
  assert.equal(isSimilarQuestion({...source,axis:''},{...candidate,axis:''}),false);
});
