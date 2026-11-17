import {useTheme} from '../context/useTheme';
import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import './Home.css';

const REASONS = { unavailable:'Esta prueba aún no tiene preguntas disponibles. Puedes mantenerla en tu plan mientras se amplía el banco.', bank_completed:'Ya respondiste todas las preguntas disponibles de esta prueba.', reinforce:'Conviene reforzar: tus aciertos históricos son menores al 60%, con al menos cinco respuestas.', explore:'Aún hay pocas respuestas para orientar la recomendación. Comienza o continúa explorando esta prueba.', continue:'Continúa avanzando en el banco disponible.' };

export default function StudyPlan() {
  const {lang}=useTheme();
  const localize = value => uiText(lang,value);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan,setPlan] = useState(null);
  const [draft,setDraft] = useState(null);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [saving,setSaving] = useState(false);
  const [reload,setReload] = useState(0);
  const savingRef = useRef(false);
  const uid = user?.uid;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch('/study-plan',{ signal:controller.signal }).then(res => {
      if (controller.signal.aborted) return;
      setPlan(res.data);
      setDraft(res.data.settings);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  },[uid,reload]);

  const dirty = plan && draft && (Number(draft.dailyGoal) !== plan.settings.dailyGoal || JSON.stringify(draft.testIds) !== JSON.stringify(plan.settings.testIds));
  useEffect(() => {
    const refreshIfClean = () => {
      if (!dirty && !saving && !document.hidden) { setError(''); setPlan(null); setDraft(null); setReload(n => n+1); }
    };
    window.addEventListener('focus',refreshIfClean);
    const timer = window.setInterval(() => {
      const parts = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date());
      const date = ['year','month','day'].map(type => parts.find(p => p.type === type).value).join('-');
      if (plan && plan.date !== date) refreshIfClean();
    },60000);
    return () => { window.removeEventListener('focus',refreshIfClean); window.clearInterval(timer); };
  },[dirty,saving,plan]);

  const refresh = () => { setError(''); setPlan(null); setDraft(null); setReload(n => n+1); };
  const save = async event => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setError(''); setMessage('');
    try {
      await apiFetch('/study-plan',{ method:'PUT',body:JSON.stringify({ ...draft,dailyGoal:Number(draft.dailyGoal) }) });
      setMessage(localize("Tu plan quedó guardado."));
      refresh();
    } catch(err) { setError(err.message); }
    finally { savingRef.current=false; setSaving(false); }
  };
  const changed = dirty;

  return <div className="home-dashboard">
    <header className="home-header"><div><h1> {localize("Plan de estudio")} </h1><p> {localize("Organiza tu práctica diaria según las pruebas que preparas y tu progreso.")} </p></div><button onClick={refresh} disabled={saving || (!plan && !error)}> {localize("Actualizar progreso")} </button></header>
    {message && <p role="status">{message}</p>}
    {error && <div className="home-panel" role="alert"><p>{error}</p>{!plan && <button onClick={refresh}> {localize("Reintentar")} </button>}</div>}
    {!plan && !error && <ContentSkeleton kind="form" />}
    {plan && draft && <>
      <form className="home-panel" onSubmit={save}>
        <h2> {localize("Configura tu meta")} </h2>
        {!plan.saved && <p className="home-hint"> {localize("Esta propuesta usa tus pruebas seleccionadas. Guarda los cambios para conservar tu plan.")} </p>}
        <label style={{ display:'block',margin:'16px 0' }}> {localize("Preguntas diarias (1 a 20)")} <input type="number" min="1" max="20" required disabled={saving} value={draft.dailyGoal} onChange={e => setDraft({ ...draft,dailyGoal:e.target.value })} style={{ display:'block',padding:8,marginTop:8,width:100,backgroundColor:'var(--soft)',color:'var(--ink)',border:'1px solid var(--line)',borderRadius:8 }} /></label>
        <fieldset disabled={saving} style={{ padding:16,border:'1px solid var(--line)',borderRadius:10 }}><legend> {localize("Pruebas que quieres preparar")} </legend>
          {[['m1',localize("Matemática M1")],['m2',localize("Matemática M2")],['lectora',localize("Competencia Lectora")],['cien',localize("Ciencias")],['hist',localize("Historia")]].map(([id,label]) => <label key={id} style={{ display:'block',padding:'6px 0' }}><input type="checkbox" checked={draft.testIds.includes(id)} onChange={e => setDraft({ ...draft,testIds:e.target.checked ? [...draft.testIds,id] : draft.testIds.filter(test => test !== id) })} /> {localize(label)}</label>)}
        </fieldset>
        <p className="home-hint"> {localize("La meta organiza tu estudio; no modifica tu cuota diaria. La práctica disponible usa dificultad intermedia.")} </p>
        <button disabled={saving || !draft.testIds.length}>{saving ? localize("Guardando…") : localize("Guardar plan")}</button>
        {changed && <p className="home-hint"> {localize("Guarda tus cambios para actualizar las recomendaciones de abajo.")} </p>}
      </form>
      <section className="home-section home-panel"><h2> {localize("Tu objetivo de hoy")} </h2><p><strong>{plan.completedToday} / {plan.settings.dailyGoal}</strong> {localize("preguntas respondidas en las pruebas de este plan.")} </p><progress aria-label={localize("Avance de la meta diaria")} value={Math.min(plan.completedToday,plan.settings.dailyGoal)} max={plan.settings.dailyGoal} />
        <p className="home-hint"> {localize("Día de estudio:")} {plan.date} {localize("· Hora de Chile")} </p>
        {plan.remainingGoal === 0 ? <p role="status"> {localize("¡Cumpliste tu meta de hoy!")} </p> : plan.quotaRemaining === 0 ? <p> {localize("Tu cuota de hoy está agotada. Podrás continuar al comenzar un nuevo día en Chile.")} </p> : plan.scheduled === 0 ? <p> {localize("No hay preguntas nuevas disponibles en las pruebas de tu plan. Puedes elegir otra prueba con contenido disponible.")} </p> : <p> {localize("Te proponemos responder")} {plan.scheduled} {localize("preguntas más hoy")} {plan.scheduled < plan.remainingGoal ? localize(", según tu cuota y el contenido disponible") : ''}.</p>}
      </section>
      <section className="home-section"><h2> {localize("Recomendaciones por prueba")} </h2><p className="home-hint"> {localize("Se distribuyen las preguntas pendientes empezando por las pruebas que conviene reforzar. Es una orientación basada en tus respuestas, no una evaluación de dominio ni un puntaje PAES.")} </p>
        <div className="home-grid">{plan.tasks.map(task => <article className="home-panel" key={task.testId}><h3>{localize(task.label)}</h3><p>{localize(REASONS[task.reason])}</p><p className="home-hint"> {localize("Historial:")} {task.answered} {localize("respuestas")} {task.accuracy !== null ? ` · ${task.accuracy}% ${lang==='en'?'correct':'de aciertos'}` : ''} {localize(". Banco actual:")} {task.completed} / {task.available} {localize("respondidas.")} </p><p><strong>{task.scheduled}</strong> {localize("preguntas propuestas para hoy.")} </p><button disabled={task.scheduled === 0 || changed || saving} onClick={() => navigate(`/practicar?testId=${task.testId}&difficulty=d2`)}> {localize("Practicar")} {localize(task.label)}</button></article>)}</div>
      </section>
      <p className="home-hint"> {localize("El cumplimiento se actualiza con respuestas guardadas. No necesitas marcar tareas manualmente.")} </p>
      <button onClick={() => navigate('/')}> {localize("Ver mi progreso")} </button>
    </>}
  </div>;
}
