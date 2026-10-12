import { canPractice, contentId } from './questionBank.js';
import { dailyQuota, practiceDate } from './practice.js';

export const SUBJECTS = [['m1', 'Matemática M1'], ['m2', 'Matemática M2'], ['lectora', 'Competencia Lectora'], ['cien', 'Ciencias'], ['hist', 'Historia']];

function answerDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export function studyActivity(answers, now = new Date()) {
  const today = practiceDate(now);
  const dates = [...new Set(answers.map(a => answerDate(a.answeredAt)).filter(d => d && d <= now).map(practiceDate))].sort().reverse();
  const previousDay = date => {
    const day = new Date(`${date}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 1);
    return day.toISOString().slice(0, 10);
  };
  const lastActiveDate = dates[0] || null;
  let streak = 0;
  if (lastActiveDate === today || lastActiveDate === previousDay(today)) {
    let expected = lastActiveDate;
    for (const date of dates) {
      if (date !== expected) break;
      streak++;
      expected = previousDay(expected);
    }
  }
  return { streak, lastActiveDate, practicedToday: dates.includes(today) };
}

export function summarizeProgress(user, history, questions, now = new Date()) {
  const byId = new Map(questions.map(q => [q.id, q]));
  const available = new Map(questions.filter(canPractice).map(q => [contentId(q), q]));
  const attempts = new Map();
  // Retain first attempts when historical random IDs repeat canonical content.
  const ordered = [...history].sort((a, b) => (answerDate(a.answeredAt)?.getTime() ?? Infinity) - (answerDate(b.answeredAt)?.getTime() ?? Infinity));
  for (const answer of ordered) {
    if (typeof answer.isCorrect !== 'boolean' || !SUBJECTS.some(([id]) => id === answer.testId)) continue;
    const old = byId.get(answer.questionId || answer.id);
    const identity = answer.contentId || (old && typeof old.statement === 'string' && Array.isArray(old.options) ? contentId(old) : `legacy:${answer.id}`);
    if (!attempts.has(identity)) attempts.set(identity, { ...answer, identity });
  }
  const rows = [...attempts.values()];
  const totals = values => {
    const answered = values.length;
    const correct = values.filter(a => a.isCorrect).length;
    return { answered, correct, incorrect: answered - correct, accuracy: answered ? Math.round(100 * correct / answered) : null };
  };
  const date = practiceDate(now);
  const subjects = SUBJECTS.map(([testId, label]) => {
    const bank = [...available].filter(([, q]) => q.testId === testId);
    const completed = bank.filter(([id]) => attempts.has(id)).length;
    const subjectRows = rows.filter(a => a.testId === testId);
    const today = totals(subjectRows.filter(a => { const d = answerDate(a.answeredAt); return d && d <= now && practiceDate(d) === date; }));
    return { testId, label, ...totals(subjectRows), today, available: bank.length, completed, remaining: bank.length - completed, coverage: bank.length ? Math.round(100 * completed / bank.length) : null };
  });
  const medals = Object.fromEntries(['bronze','silver','gold','diamond','platinum'].map(tier => [tier, Number.isFinite(user.medals?.[tier]) && user.medals[tier] >= 0 ? user.medals[tier] : 0]));
  return {
    ...totals(rows), subjects, medals, quota: dailyQuota(user, now), ...studyActivity(rows, now),
    today: totals(rows.filter(a => { const d = answerDate(a.answeredAt); return d && d <= now && practiceDate(d) === date; })),
    recent: rows.filter(a => answerDate(a.answeredAt)).sort((a,b) => answerDate(b.answeredAt) - answerDate(a.answeredAt)).slice(0,5).map(a => ({ testId: a.testId, isCorrect: a.isCorrect, answeredAt: answerDate(a.answeredAt).toISOString() })),
    updatedAt: now.toISOString(),
  };
}
