import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeProgress, studyActivity } from '../src/services/progress.js';
import { contentId } from '../src/services/questionBank.js';

const now = new Date('2026-10-09T15:00:00Z');
const question = { id: 'current', testId: 'm1', statement: '1 + 1', options: ['1','2','3','4'], correctAnswer: 'B', status: 'published', bankVersion: 2 };
const answer = (id, date, isCorrect = true, extra = {}) => ({ id, testId: 'm1', answeredAt: new Date(date), isCorrect, ...extra });

test('a newly registered profile has no invented activity, accuracy or coverage', () => {
  const result = summarizeProgress({ streak: 1, lastActiveDate: '2026-10-09' }, [], [question], now);
  assert.equal(result.answered, 0);
  assert.equal(result.accuracy, null);
  assert.equal(result.streak, 0);
  assert.equal(result.lastActiveDate, null);
  assert.equal(result.subjects[0].coverage, 0);
  assert.equal(result.subjects.find(s => s.testId === 'hist').coverage, null);
});

test('legacy and canonical duplicates count the first answer once', () => {
  const legacy = { ...question, id: 'random-old-id', bankVersion: 1 };
  const rows = [answer(legacy.id, '2026-10-08T15:00:00Z', false), answer('later', '2026-10-09T15:00:00Z', true, { contentId: contentId(question) })];
  const result = summarizeProgress({}, rows, [question, legacy], now);
  assert.equal(result.answered, 1);
  assert.equal(result.correct, 0);
  assert.equal(result.subjects[0].completed, 1);
  assert.equal(result.subjects[0].coverage, 100);
});

test('retired and missing questions remain in historical accuracy without inflating current coverage', () => {
  const archived = { ...question, id: 'old', statement: 'Old item', status: 'archived' };
  const result = summarizeProgress({}, [answer('old','2026-10-08T15:00:00Z'), answer('missing','2026-10-09T15:00:00Z',false)], [question, archived], now);
  assert.equal(result.answered, 2);
  assert.equal(result.accuracy, 50);
  assert.equal(result.subjects[0].completed, 0);
  assert.equal(result.today.answered, 1);
});

test('streak is based on Chile dates, crosses month boundaries and expires after a missed day', () => {
  const rows = ['2026-09-30T15:00:00Z','2026-10-01T15:00:00Z'].map((d,i) => answer(String(i),d));
  assert.equal(studyActivity(rows,new Date('2026-10-02T02:59:59Z')).streak,2);
  assert.equal(studyActivity(rows,new Date('2026-10-02T03:00:00Z')).streak,2);
  assert.equal(studyActivity(rows,new Date('2026-10-03T15:00:00Z')).streak,0);
  assert.equal(studyActivity([...rows, answer('extra','2026-10-01T17:00:00Z')],new Date('2026-10-02T15:00:00Z')).streak,2);
});

test('unknown timestamps and future dates do not create a streak', () => {
  assert.equal(studyActivity([{ isCorrect: true }, { answeredAt: 'invalid' }, answer('future','2027-01-01T15:00:00Z')],now).streak,0);
});

test('daily quota refreshes without changing real medal balances', () => {
  const result = summarizeProgress({ medals: { bronze: 3, gold: 1 }, quota: { date: '2026-10-08', used: 20, max: 20 } }, [], [question], now);
  assert.equal(result.quota.used,0);
  assert.equal(result.quota.date,'2026-10-09');
  assert.equal(result.medals.bronze,3);
  assert.equal(result.medals.gold,1);
});

test('pending questions stay excluded while published supplier complements count in progress', () => {
  const result = summarizeProgress({}, [], [question, { ...question,id:'pending',statement:'pending',status:'pending_review' },{ ...question,id:'extra',statement:'extra',pedagogicalUse:'complementario' }], now);
  assert.equal(result.subjects[0].available,2);
});
