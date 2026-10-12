import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentId, validQuestion, canPractice, formatQuestion } from '../src/services/questionBank.js';
import { practiceDate, dailyQuota, dailyActivity, answeredContents } from '../src/services/practice.js';
import { readBank } from '../src/data/seedData.js';

const q = { testId: 'm1', statement: '¿Cuánto es 1 + 1?', options: ['1', '2', '3', '4'], correctAnswer: 'B', status: 'published', bankVersion: 2 };

test('the complete local bank publishes only valid unique content and keeps ambiguous questions pending', () => {
  const bank = readBank();
  assert.equal(bank.size, 1419);
  assert.equal([...bank.values()].filter(canPractice).length, 1360);
  assert.equal([...bank.values()].filter(q => canPractice(q) && q.pedagogicalUse === 'complementario').length, 591);
  assert.equal([...bank.values()].filter(q => q.status === 'pending_review').length, 59);
  for (const [id, q] of bank) {
    assert.equal(id, contentId(q));
    if (q.status === 'published') assert.equal(validQuestion(q), true);
  }
});

test('supplier complementary questions are included while editorial pending remains excluded', () => {
  const raw = { pregunta: 'Logaritmos', alternativas: ['1','2','3','4'], respuesta_correcta: 'B', estado_revision: 'lista', prueba: 'm2', uso_pedagogico: 'complementario' };
  const formatted = formatQuestion(raw, { testId: 'm1', axis: 'Matemática' }, { file: 'fixture', index: 1 });
  assert.equal(formatted.testId, 'm2');
  assert.equal(formatted.skillId, 'sk_m2_general');
  assert.equal(formatted.status, 'published');
  assert.equal(canPractice(formatted), true);
  assert.equal(canPractice({ ...q, pedagogicalUse: 'complementario' }), true);
  assert.equal(canPractice(formatQuestion({ ...raw, estado_revision:'pendiente' }, {testId:'m1'}, {file:'fixture',index:2})), false);
});

test('content corrections and curriculum decisions protect student practice', () => {
  const bank = [...readBank().values()];
  const bySource = (fragment, index) => bank.find(q => q.source.file.toLowerCase().includes(fragment) && q.source.index === index);
  assert.equal(bySource('matematicas 2.json', 3).correctAnswer, 'C');
  assert.equal(bySource('matematica 12.json', 9).correctAnswer, 'D');
  const probability = bySource('matematicas 10.json', 6);
  assert.equal(probability.options.includes('4/6'), false);
  assert.equal(canPractice(probability), true);
  assert.equal(bank.filter(canPractice).some(q => /derivada|integral ∫/i.test(q.statement)), true);
  assert.equal(bank.filter(canPractice).some(q => q.testId === 'm2'), true);
  assert.equal(bank.filter(canPractice).some(q => q.testId === 'lectora'), true);
});

test('identity ignores option order and whitespace but preserves case-sensitive math content', () => {
  assert.equal(contentId(q), contentId({ ...q, statement: ' ¿Cuánto  es 1 + 1? ', options: ['4', '3', '2', '1'] }));
  assert.notEqual(contentId(q), contentId({ ...q, testId: 'm2' }));
  assert.notEqual(contentId(q), contentId({ ...q, statement: '¿CUÁNTO es 1 + 1?' }));
});

test('duplicate alternatives and missing correct option are not playable', () => {
  assert.equal(canPractice({ ...q, options: ['1', '2', '2', '4'] }), false);
  assert.equal(canPractice({ ...q, correctAnswer: 'E' }), false);
  assert.equal(canPractice({ ...q, status: 'pending_review' }), false);
  assert.equal(canPractice({ ...q, bankVersion: undefined }), false);
});

test('quota resets at midnight in Chile rather than UTC', () => {
  assert.equal(practiceDate(new Date('2026-10-09T02:59:59Z')), '2026-10-08');
  assert.equal(practiceDate(new Date('2026-10-09T03:00:00Z')), '2026-10-09');
  const user = { quota: { date: '2026-10-08', used: 20, max: 20 } };
  assert.equal(dailyQuota(user, new Date('2026-10-09T02:59:59Z')).used, 20);
  assert.equal(dailyQuota(user, new Date('2026-10-09T03:00:00Z')).used, 0);
});

test('daily activity increments once and restarts streak after inactivity', () => {
  assert.equal(dailyActivity({ streak: 5, lastActiveDate: '2026-10-08' }, '2026-10-09').streak, 6);
  assert.equal(dailyActivity({ streak: 5, lastActiveDate: '2026-10-09' }, '2026-10-09').streak, 5);
  assert.equal(dailyActivity({ streak: 5, lastActiveDate: '2026-10-07' }, '2026-10-09').streak, 1);
});

test('legacy random IDs still exclude their canonical content', async () => {
  const previous = { testId: 'm1', selectedOption: 'B', isCorrect: true };
  const history = { docs: [{ id: 'old-random-id', data: () => previous }] };
  const known = await answeredContents(history, async ids => { assert.deepEqual(ids, ['old-random-id']); return [{ exists: true, data: () => q }]; });
  assert.equal(known.get(contentId(q)).selectedOption, previous.selectedOption);
  assert.equal(known.get(contentId(q)).selectedText, '2');
});
