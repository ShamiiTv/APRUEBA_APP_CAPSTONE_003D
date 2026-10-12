import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import './Home.css';
import MedalIcon from '../components/MedalIcon';

const COPY = {
  es: { loading: 'Cargando tu progreso…', retry: 'Reintentar', refresh: 'Actualizar', title: 'Tu progreso de práctica', answered: 'Respondidas', correct: 'Aciertos', accuracy: 'Porcentaje de aciertos', none: 'Sin respuestas todavía', days: 'días de práctica consecutivos', startStreak: 'Tu racha comienza al responder una pregunta.', practiced: 'Ya practicaste hoy.', continueStreak: 'Practica hoy para mantener tu racha.', today: 'Hoy', quota: 'Preguntas usadas hoy', unlimited: 'Sin límite diario', medals: 'Saldo de medallas', medalLink: 'Ver medallas', bank: 'Avance por prueba', bankHint: 'El avance cuenta preguntas respondidas del banco actual. Los aciertos incluyen tu historial, aunque una pregunta haya sido retirada. No es un puntaje PAES.', available: 'respondidas del banco actual', history: 'respuestas históricas', hits: 'aciertos', emptyBank: 'Banco aún no disponible', practice: 'Practicar', intro: 'Cada respuesta que guardes aparecerá aquí. Elige una prueba para comenzar.', ready: 'Continúa tu preparación', readyHint: 'Practica con preguntas de dificultad intermedia del banco disponible.', limit: 'Usaste tu cuota de hoy. Podrás continuar cuando se renueve al comenzar un nuevo día en Chile.', recent: 'Últimas respuestas', right: 'Correcta', wrong: 'Incorrecta', updated: 'Actualizado', bronze: 'Bronce', silver: 'Plata', gold: 'Oro', diamond: 'Diamante', platinum: 'Platino', error: 'No se pudo cargar tu progreso. Intenta nuevamente.' },
  en: { loading: 'Loading your progress…', retry: 'Retry', refresh: 'Refresh', title: 'Your practice progress', answered: 'Answered', correct: 'Correct', accuracy: 'Accuracy', none: 'No answers yet', days: 'consecutive practice days', startStreak: 'Your streak starts when you answer a question.', practiced: 'You practiced today.', continueStreak: 'Practice today to keep your streak.', today: 'Today', quota: 'Questions used today', unlimited: 'No daily limit', medals: 'Medal balance', medalLink: 'View medals', bank: 'Progress by test', bankHint: 'Progress counts answered questions in the current bank. Accuracy includes historical answers, even when a question was retired. This is not a PAES score.', available: 'answered in the current bank', history: 'historical answers', hits: 'correct', emptyBank: 'Question bank not available yet', practice: 'Practice', intro: 'Your saved answers will appear here. Choose a test to get started.', ready: 'Continue your preparation', readyHint: 'Practice intermediate questions from the available bank.', limit: 'You used today’s quota. It renews at the start of a new day in Chile.', recent: 'Recent answers', right: 'Correct', wrong: 'Incorrect', updated: 'Updated', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond', platinum: 'Platinum', error: 'Your progress could not be loaded. Please retry.' },
};

export default function Home() {
  const { user, updateUserState } = useAuth();
  const { t, lang } = useTheme();
  const copy = COPY[lang] || COPY.es;
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const quotaDate = useRef(null);
  const uid = user?.uid;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch('/progress', { signal: controller.signal }).then(res => {
      if (controller.signal.aborted) return;
      setProgress(res.data);
      quotaDate.current = res.data.quota.date;
      updateUserState({ quota: res.data.quota, medals: res.data.medals, streak: res.data.streak, lastActiveDate: res.data.lastActiveDate });
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [uid, reload, updateUserState]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden) { setProgress(null); setError(false); setReload(n => n + 1); } };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(() => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const date = ['year','month','day'].map(type => parts.find(p => p.type === type).value).join('-');
      if (quotaDate.current && quotaDate.current !== date) refresh();
    }, 60000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(timer); };
  }, []);

  const refresh = () => { setProgress(null); setError(false); setReload(n => n + 1); };
  const dateFormat = value => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  const goPractice = testId => navigate(`/practicar?testId=${encodeURIComponent(testId)}&difficulty=d2`);
  const eligible = progress?.subjects.filter(s => s.available > s.completed) || [];
  const preferred = eligible.find(s => user?.selectedTests?.includes(s.testId)) || eligible[0] || progress?.subjects.find(s => s.available > 0);
  const quotaReached = progress && !progress.quota.unlimited && progress.quota.used >= progress.quota.max;

  return <div className="home-dashboard">
    <header className="home-header">
      <div><h1>{t.home.greeting.replace('{name}', user?.name || 'Estudiante')}</h1><p>{copy.title}</p></div>
      <button onClick={refresh} disabled={!progress && !error}>{copy.refresh}</button>
    </header>
    <p className="home-section"><button onClick={() => navigate('/plan-estudio')}>{lang === 'en' ? 'Open my study plan' : 'Ver mi plan de estudio'}</button></p>
    {error ? <div className="home-panel" role="alert"><p>{copy.error}</p><button onClick={refresh}>{copy.retry}</button></div>
      : !progress ? <p role="status">{copy.loading}</p>
      : <>
        {progress.answered === 0 && <p className="home-panel">{copy.intro}</p>}
        <section className="home-grid" aria-label={copy.title}>
          <Metric label={copy.answered} value={progress.answered} />
          <Metric label={copy.correct} value={progress.correct} />
          <Metric label={copy.accuracy} value={progress.accuracy === null ? '—' : `${progress.accuracy}%`} detail={progress.accuracy === null ? copy.none : null} />
          <Metric label={t.home.studyStreak} value={progress.streak} detail={`${copy.days}. ${progress.streak === 0 ? copy.startStreak : progress.practicedToday ? copy.practiced : copy.continueStreak}`} />
        </section>
        <section className="home-grid home-section">
          <Metric label={copy.quota} value={`${progress.quota.used} / ${progress.quota.unlimited ? '∞' : progress.quota.max}`} detail={progress.quota.unlimited ? copy.unlimited : `${copy.today}: ${progress.today.correct} ${copy.hits} / ${progress.today.answered}`} />
          <div className="home-panel"><h2>{copy.medals}</h2><div className="home-medals">{['bronze','silver','gold','diamond','platinum'].map(tier => <span className="home-medal" key={tier}><MedalIcon tier={tier} /><span>{copy[tier]}: <strong>{progress.medals[tier] ?? 0}</strong></span></span>)}</div><button onClick={() => navigate('/medallas')}>{copy.medalLink}</button></div>
        </section>
        <section className="home-section">
          <h2>{copy.bank}</h2><p className="home-hint">{copy.bankHint}</p>
          <div className="home-grid">{progress.subjects.map(subject => <article className="home-panel" key={subject.testId}>
            <h3>{subject.label}</h3>
            {subject.available > 0 ? <><p><strong>{subject.completed} / {subject.available}</strong> {copy.available}</p><progress aria-label={`${subject.label}: ${subject.completed} / ${subject.available}`} value={subject.completed} max={subject.available} /><p className="home-hint">{subject.coverage}%</p></> : <p>{copy.emptyBank}</p>}
            <p className="home-hint">{subject.answered} {copy.history} · {subject.correct} {copy.hits}{subject.accuracy !== null ? ` (${subject.accuracy}%)` : ''}</p>
            <button disabled={!subject.available || quotaReached} onClick={() => goPractice(subject.testId)}>{copy.practice}</button>
          </article>)}</div>
        </section>
        <section className="home-banner home-section"><div><h2>{copy.ready}</h2><p>{quotaReached ? copy.limit : copy.readyHint}</p></div><button disabled={!preferred || quotaReached} onClick={() => goPractice(preferred.testId)}>{copy.practice}</button></section>
        {progress.recent.length > 0 && <section className="home-panel home-section"><h2>{copy.recent}</h2><ul className="home-recent">{progress.recent.map((answer, index) => <li key={index}><span>{progress.subjects.find(s => s.testId === answer.testId)?.label} · {answer.isCorrect ? copy.right : copy.wrong}</span><time dateTime={answer.answeredAt}>{dateFormat(answer.answeredAt)}</time></li>)}</ul></section>}
        <p className="home-hint">{copy.updated}: <time dateTime={progress.updatedAt}>{dateFormat(progress.updatedAt)}</time> · America/Santiago</p>
      </>}
  </div>;
}

function Metric({ label, value, detail }) {
  return <div className="home-panel"><h2>{label}</h2><div className="home-value">{value}</div>{detail && <p className="home-hint">{detail}</p>}</div>;
}
