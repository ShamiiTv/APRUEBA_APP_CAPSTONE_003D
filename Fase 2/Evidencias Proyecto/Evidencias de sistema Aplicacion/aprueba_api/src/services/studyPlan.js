import { SUBJECTS } from './progress.js';

export function validateStudyPlan(value) {
  return Boolean(value && Object.keys(value).every(k => ['dailyGoal','testIds'].includes(k)) && Number.isInteger(value.dailyGoal) && value.dailyGoal >= 1 && value.dailyGoal <= 20 && Array.isArray(value.testIds) && value.testIds.length > 0 && value.testIds.length <= SUBJECTS.length && new Set(value.testIds).size === value.testIds.length && value.testIds.every(id => SUBJECTS.some(([testId]) => id === testId)));
}

export function buildStudyPlan(user, progress) {
  const saved = validateStudyPlan(user.studyPlan);
  const fallback = [...new Set((user.selectedTests || []).filter(id => SUBJECTS.some(([testId]) => id === testId)))];
  const settings = saved ? user.studyPlan : { dailyGoal: 10, testIds: fallback.length ? fallback : ['m1','lectora'] };
  const subjects = progress.subjects.filter(s => settings.testIds.includes(s.testId));
  const completedToday = subjects.reduce((sum,s) => sum + (s.today?.answered || 0), 0);
  const remainingGoal = Math.max(0,settings.dailyGoal - completedToday);
  const quotaRemaining = progress.quota.unlimited ? null : Math.max(0, progress.quota.max - progress.quota.used);
  let budget = Math.min(remainingGoal, quotaRemaining ?? remainingGoal);
  const tasks = subjects.map(s => ({ ...s, scheduled: 0, reason: !s.available ? 'unavailable' : !s.remaining ? 'bank_completed' : s.answered >= 5 && s.accuracy < 60 ? 'reinforce' : s.answered < 5 ? 'explore' : 'continue' }));
  const eligible = tasks.filter(s => s.remaining > 0).sort((a,b) => (a.reason === 'reinforce' ? 0 : a.reason === 'explore' ? 1 : 2) - (b.reason === 'reinforce' ? 0 : b.reason === 'explore' ? 1 : 2) || a.answered - b.answered);
  while (budget > 0) {
    let assigned = false;
    for (const task of eligible) {
      if (budget > 0 && task.scheduled < task.remaining) { task.scheduled++; budget--; assigned = true; }
    }
    if (!assigned) break;
  }
  return { settings, saved, date: progress.quota.date, completedToday, remainingGoal, quotaRemaining, tasks, scheduled: tasks.reduce((n,s) => n+s.scheduled,0), updatedAt: progress.updatedAt };
}
