import { contentId, optionsOf } from './questionBank.js';

export function practiceDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function dailyQuota(user, now = new Date()) {
  const date = practiceDate(now);
  const old = user.quota || {};
  return { ...old, date, max: Number.isInteger(old.max) && old.max >= 0 ? old.max : 20, used: old.date === date && Number.isInteger(old.used) && old.used >= 0 ? old.used : 0, unlimited: old.unlimited === true };
}

export function dailyActivity(user, date) {
  if (user.lastActiveDate === date) return { streak: user.streak || 1, lastActiveDate: date };
  const yesterday = new Date(`${date}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return { streak: user.lastActiveDate === yesterday.toISOString().slice(0, 10) ? (user.streak || 0) + 1 : 1, lastActiveDate: date };
}

// Los históricos anteriores guardaban IDs aleatorios. Se conserva su vínculo
// de contenido para no repetir ni premiar de nuevo al migrar el banco.
export async function answeredContents(history, readQuestions) {
  const known = new Map();
  const legacy = [];
  for (const answer of history.docs) {
    const data = answer.data();
    if (data.contentId) known.set(data.contentId, data);
    else legacy.push(answer);
  }
  if (legacy.length) {
    const docs = await readQuestions(legacy.map(answer => answer.id));
    docs.forEach((doc, index) => {
      if (doc.exists && typeof doc.data().statement === 'string' && Array.isArray(doc.data().options)) {
        const previous = legacy[index].data();
        const selectedText = optionsOf(doc.data()).find(option => option.id === previous.selectedOption)?.text;
        known.set(contentId(doc.data()), { ...previous, selectedText });
      }
    });
  }
  return known;
}
