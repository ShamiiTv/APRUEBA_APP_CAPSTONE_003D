import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fields, text, identifier, requestId, groupLimit, postView, dateISO } from '../src/services/social.js';

test('social inputs reject invalid bodies, forged fields, whitespace and excessive text', () => {
  for (const body of [null, [], 'text', { ownerId: 'other' }]) assert.throws(() => fields(body, ['text']));
  assert.equal(text('  Una duda  ', 100), 'Una duda');
  for (const value of ['', ' ', 42, {}, 'a'.repeat(101)]) assert.throws(() => text(value, 100));
});
test('operation and document IDs cannot contain paths or unbounded content', () => {
  assert.equal(identifier('fixture-id_1'), 'fixture-id_1');
  assert.equal(requestId({ requestId: randomUUID() }).length, 36);
  for (const value of ['bad/path', '', 42, 'a'.repeat(129)]) assert.throws(() => identifier(value));
  for (const value of ['short', 'bad/path', null, 'a'.repeat(81)]) assert.throws(() => requestId({ requestId: value }));
});
test('group limits follow active plan rights and fall back to free for inactive plans', () => {
  assert.equal(groupLimit({}), 1);
  assert.equal(groupLimit({ plan: 'uni', planStatus: 'active' }), 3);
  assert.equal(groupLimit({ plan: 'all', planStatus: 'active' }), 0);
  assert.equal(groupLimit({ plan: 'all', planStatus: 'canceled' }), 1);
  assert.equal(groupLimit({ plan: 'unknown', planStatus: 'active' }), 1);
});
test('public projection never returns stored answer keys, explanations or private account fields', () => {
  const result = postView({ id: 'post', data: () => ({ authorUid:'user', author:{name:'Alumna',email:'private@example.test'},text:'Duda',question:{id:'q',statement:'Pregunta',testId:'m1',correctAnswer:'A',explanation:'Secreto',options:[{id:'A',text:'Alternativa',correct:true}]},createdAt:new Date('2026-10-09T12:00:00Z') }) });
  assert.deepEqual(result.author,{ name:'Alumna' });
  assert.deepEqual(result.question.options,[{ id:'A',text:'Alternativa' }]);
  assert.equal(result.question.correctAnswer,undefined);
  assert.equal(result.question.explanation,undefined);
  assert.equal(result.createdAt,'2026-10-09T12:00:00.000Z');
  assert.equal(dateISO('invalid'),null);
});
