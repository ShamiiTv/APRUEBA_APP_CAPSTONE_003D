import ApruebaIcon from '../components/ApruebaIcon';
import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import './Home.css';
import './Dashboard.css';
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
  const [refreshing,setRefreshing]=useState(true);
  const fetching=useRef(false);
  const [reload, setReload] = useState(0);
  const quotaDate = useRef(null);
  const uid = user?.uid;

  useEffect(() => {
    const controller = new AbortController();
    fetching.current=true;
    apiFetch('/progress', { signal: controller.signal }).then(res => {
      if (controller.signal.aborted) return;
      setProgress(res.data);
      quotaDate.current = res.data.quota.date;
      updateUserState({ quota: res.data.quota, medals: res.data.medals, streak: res.data.streak, lastActiveDate: res.data.lastActiveDate });
    }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(()=>{if(!controller.signal.aborted){fetching.current=false;setRefreshing(false);}});
    return () => controller.abort();
  }, [uid, reload, updateUserState]);

  useEffect(() => {
    const refresh = () => { if (!document.hidden && !fetching.current) { fetching.current=true;setRefreshing(true);setError(false); setReload(n => n + 1); } };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(() => {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const date = ['year','month','day'].map(type => parts.find(p => p.type === type).value).join('-');
      if (quotaDate.current && quotaDate.current !== date) refresh();
    }, 60000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(timer); };
  }, []);

  const refresh = () => {if(fetching.current)return;fetching.current=true;setRefreshing(true);setError(false);setReload(n=>n+1);};
  const text=(es,en)=>lang==='en'?en:es;
  const dateFormat = value => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  const goPractice = testId => navigate(`/practicar?testId=${encodeURIComponent(testId)}&difficulty=d2`);
  const eligible = progress?.subjects.filter(s => s.available > s.completed) || [];
  const quotaReached = progress && !progress.quota.unlimited && progress.quota.used >= progress.quota.max;
  const accessible = eligible.filter(subject=>!quotaReached || progress.quota.unlimitedTestId===subject.testId);
  const preferred = accessible.find(s=>s.testId===progress?.quota.unlimitedTestId) || accessible.find(s=>user?.selectedTests?.includes(s.testId)) || accessible[0];
  const subjectStyle={m1:['M1','#7c5cce'],m2:['M2','#3876c5'],lectora:['CL','#a45b25'],cien:['CI','#16856b'],hist:['HI','#a65372']};
  const accessLabel = progress?.quota.unlimited ? text('Acceso completo · Sin límite diario','Full access · No daily limit') : progress?.quota.unlimitedTestId ? `${uiText(lang,progress.subjects.find(s=>s.testId===progress.quota.unlimitedTestId)?.label)} · ${copy.unlimited}` : text(`Plan gratuito · ${progress?.quota.max || 10} preguntas al día`,`Free plan · ${progress?.quota.max || 10} questions per day`);
  return <div className="home-dashboard dashboard-page">
    <header className="dashboard-heading"><div><span className="dashboard-eyebrow">{text('APRENDE · PRACTICA · AVANZA','LEARN · PRACTICE · GROW')}</span><h1>{text('Tu espacio de estudio','Your study space')}</h1><p>{text('Tu preparación PAES, paso a paso.','Your PAES preparation, step by step.')}</p></div><button className="dashboard-secondary" onClick={refresh} disabled={refreshing}>{refreshing?text('Actualizando…','Refreshing…'):copy.refresh}</button></header>
    {error && <div className="dashboard-notice" role="alert"><p>{progress?text('No se pudo actualizar. Se muestra el último progreso cargado.','Could not refresh. Showing your last loaded progress.'):copy.error}</p><button onClick={refresh} disabled={refreshing}>{copy.retry}</button></div>}
    {!progress && !error && <ContentSkeleton kind="home"/>}
    {progress && <>
      <section className="dashboard-hero">
        <div className="dashboard-hero-content"><span className="dashboard-access">{accessLabel}</span><h2>{t.home.greeting.replace('{name}',user?.name?.split(' ')[0] || text('Estudiante','Student'))}</h2><p>{progress.answered===0?text('Tu próximo logro empieza con una pregunta. Elige una prueba y comienza a construir tu progreso.','Your next achievement starts with one question. Choose a test and start building your progress.'):preferred?text(`Continúa con ${uiText(lang,preferred.label)}. Cada respuesta te ayuda a avanzar.`,`Continue with ${uiText(lang,preferred.label)}. Every answer helps you move forward.`):quotaReached?copy.limit:text('Completaste las preguntas disponibles. Puedes revisar tu avance o preparar tu próxima sesión.','You completed the available questions. Review your progress or prepare your next session.')}</p><div className="dashboard-hero-actions"><button disabled={!preferred} onClick={()=>goPractice(preferred.testId)}>{progress.answered===0?text('Comenzar a practicar','Start practicing'):text('Continuar práctica','Continue practice')} <span aria-hidden="true">→</span></button><button className="dashboard-hero-secondary" onClick={()=>navigate('/plan-estudio')}>{text('Mi plan de estudio','My study plan')}</button></div></div>
        <div className="dashboard-today"><span>{text('TU ACTIVIDAD DE HOY','YOUR ACTIVITY TODAY')}</span><strong>{progress.today.answered}</strong><p>{text('preguntas respondidas','questions answered')}</p><div><span aria-hidden="true">✦</span> {progress.today.correct} {copy.hits}</div></div>
      </section>
      <section className="dashboard-metrics" aria-label={copy.title}>
        <Metric label={copy.answered} value={progress.answered} detail={text('Tu recorrido hasta hoy','Your journey so far')} symbol={<ApruebaIcon name="chart" />} accent="violet"/>
        <Metric label={copy.correct} value={progress.correct} detail={text('Respuestas correctas guardadas','Saved correct answers')} symbol={<ApruebaIcon name="check" />} accent="green"/>
        <Metric label={copy.accuracy} value={progress.accuracy===null?'—':`${progress.accuracy}%`} detail={progress.accuracy===null?copy.none:text('Sobre tus respuestas históricas','Based on your answer history')} symbol={<ApruebaIcon name="target" />} accent="blue"/>
        <Metric label={t.home.studyStreak} value={progress.streak} detail={progress.streak===0?copy.startStreak:progress.practicedToday?copy.practiced:copy.continueStreak} symbol={<ApruebaIcon name="flame" />} accent="amber"/>
      </section>
      <section className="dashboard-summary-grid">
        <article className="home-panel dashboard-access-card"><div className="dashboard-card-title"><span className="dashboard-card-icon">◷</span><h2>{progress.quota.unlimited?text('Practica a tu ritmo','Practice at your pace'):progress.quota.unlimitedTestId?text('Cuota para otras pruebas','Quota for other tests'):text('Tu cuota de hoy','Your quota today')}</h2></div><div className="dashboard-quota-value">{progress.quota.unlimited?<><strong>∞</strong><span>{copy.unlimited}</span></>:<><strong>{Math.max(0,progress.quota.max-progress.quota.used)}</strong><span>{text(`disponibles de ${progress.quota.max}`,`remaining out of ${progress.quota.max}`)}</span></>}</div>
          {progress.quota.unlimited?<p className="home-hint">{text('Todas las pruebas, sin cuota diaria. Tu meta organiza el estudio y no limita tu práctica.','All tests, without a daily quota. Your goal organizes study and does not limit practice.')}</p>:<><progress value={Math.min(progress.quota.used,progress.quota.max)} max={progress.quota.max} aria-label={text('Uso de la cuota diaria','Daily quota usage')}/><p className="home-hint">{progress.quota.used} {text('usadas hoy','used today')}{progress.quota.unlimitedTestId?` · ${accessLabel}`:''}</p><details className="dashboard-details"><summary>{text('¿Cómo funciona mi cuota?','How does my quota work?')}</summary><p>{text('Las pruebas sin acceso ilimitado comparten 10 preguntas base, más 5 por colegio y edad y otras 5 por región, comuna y dirección. Se renueva al comenzar el día en Chile.','Tests without unlimited access share 10 base questions, plus 5 for school and age and another 5 for region, commune and street address. The quota renews at the start of the day in Chile.')}</p><button className="dashboard-secondary" onClick={()=>navigate('/ajustes')}>{text('Ver mis datos','View my details')}</button></details></>}
        </article>
        <article className="home-panel dashboard-medals-card"><div className="dashboard-card-title"><span className="dashboard-card-icon">✧</span><h2>{copy.medals}</h2><button className="dashboard-text-action" onClick={()=>navigate('/medallas')}>{text('Ver todas','View all')} →</button></div><div className="dashboard-medals">{['bronze','silver','gold','diamond','platinum'].map(tier=><div key={tier}><MedalIcon tier={tier}/><strong>{progress.medals[tier]??0}</strong><span>{copy[tier]}</span></div>)}</div><p className="home-hint">{text('Tus logros se construyen con cada respuesta correcta.','Build your achievements with every correct answer.')}</p></article>
      </section>
      <section className="dashboard-subject-section"><div className="dashboard-section-heading"><div><h2>{text('Encuentra tu próximo desafío','Find your next challenge')}</h2><p>{text('Explora las pruebas y continúa desde donde estás.','Explore the tests and continue from where you are.')}</p></div></div><div className="dashboard-subject-grid">{progress.subjects.map(subject=>{const [short,accent]=subjectStyle[subject.testId] || ['PAES','#3876c5'];const completed=subject.available>0&&subject.completed>=subject.available;const blocked=quotaReached&&progress.quota.unlimitedTestId!==subject.testId;return <article className="home-panel dashboard-subject" key={subject.testId} style={{'--subject-color':accent}}><div className="dashboard-subject-heading"><span>{short}</span><h3>{uiText(lang,subject.label)}</h3></div><p className="dashboard-subject-status">{!subject.available?copy.emptyBank:completed?text('Banco completado','Bank completed'):subject.completed===0?text('Tu primera pregunta te espera','Your first question awaits'):text('Sigue construyendo tu avance','Keep building your progress')}</p><div className="dashboard-bank-numbers"><strong>{subject.completed}</strong><span>/ {subject.available} {text('respondidas','answered')}</span></div><progress value={subject.completed} max={Math.max(1,subject.available)} aria-label={`${uiText(lang,subject.label)}: ${subject.completed} / ${subject.available}`}/><p className="home-hint">{subject.answered} {copy.history}{subject.accuracy!==null?` · ${subject.accuracy}% ${copy.hits}`:''}</p><button disabled={!subject.available||completed||blocked} onClick={()=>goPractice(subject.testId)}>{!subject.available?text('Próximamente','Coming soon'):completed?text('Completada','Completed'):blocked?text('Cuota agotada','Quota reached'):copy.practice} <span aria-hidden="true">→</span></button></article>})}</div><details className="dashboard-details"><summary>{text('Sobre estas cifras','About these figures')}</summary><p>{copy.bankHint}</p></details></section>
      <section className="dashboard-explore"><h2>{text('Aprende acompañado','Learn with others')}</h2><div>{[['/tutores','book',text('Tutores','Tutors'),text('Encuentra apoyo para estudiar','Find study support')],['/grupos','group',text('Grupos de estudio','Study groups'),text('Comparte y resuelve dudas','Share and discuss questions')],['/comunidad','chat',text('Comunidad','Community'),text('Conecta con otros estudiantes','Connect with other students')]].map(([path,icon,title,hint])=><button key={path} onClick={()=>navigate(path)}><span aria-hidden="true"><ApruebaIcon name={icon} /></span><span><strong>{title}</strong><small>{hint}</small></span><span aria-hidden="true">→</span></button>)}</div></section>
      {progress.recent.length>0 && <section className="home-panel dashboard-recent"><h2>{copy.recent}</h2><ul className="home-recent">{progress.recent.map((answer,index)=><li key={index}><span className={`dashboard-answer-dot ${answer.isCorrect?'is-correct':''}`} aria-hidden="true"/><span>{uiText(lang,progress.subjects.find(s=>s.testId===answer.testId)?.label)}<small>{answer.isCorrect?copy.right:copy.wrong}</small></span><time dateTime={answer.answeredAt}>{dateFormat(answer.answeredAt)}</time></li>)}</ul></section>}
      <p className="dashboard-updated">{copy.updated}: <time dateTime={progress.updatedAt}>{dateFormat(progress.updatedAt)}</time> · Chile</p>
    </>}
  </div>;
}

function Metric({label,value,detail,symbol,accent}) {
 return <article className={`home-panel dashboard-metric dashboard-metric--${accent}`}><div><span className="dashboard-metric-symbol" aria-hidden="true">{symbol}</span><h2>{label}</h2></div><strong>{value}</strong><p>{detail}</p></article>;
}
