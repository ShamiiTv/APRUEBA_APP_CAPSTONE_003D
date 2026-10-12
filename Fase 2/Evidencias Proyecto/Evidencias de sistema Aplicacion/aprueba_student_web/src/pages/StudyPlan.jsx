import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import './Home.css';

const REASONS = { unavailable:'Esta prueba aún no tiene preguntas disponibles. Puedes mantenerla en tu plan mientras se amplía el banco.', bank_completed:'Ya respondiste todas las preguntas disponibles de esta prueba.', reinforce:'Conviene reforzar: tus aciertos históricos son menores al 60%, con al menos cinco respuestas.', explore:'Aún hay pocas respuestas para orientar la recomendación. Comienza o continúa explorando esta prueba.', continue:'Continúa avanzando en el banco disponible.' };

export default function StudyPlan() {
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
      setMessage('Tu plan quedó guardado.');
      refresh();
    } catch(err) { setError(err.message); }
    finally { savingRef.current=false; setSaving(false); }
  };
  const changed = dirty;

  return <div className="home-dashboard">
    <header className="home-header"><div><h1>Plan de estudio</h1><p>Organiza tu práctica diaria según las pruebas que preparas y tu progreso.</p></div><button onClick={refresh} disabled={saving || (!plan && !error)}>Actualizar progreso</button></header>
    {message && <p role="status">{message}</p>}
    {error && <div className="home-panel" role="alert"><p>{error}</p>{!plan && <button onClick={refresh}>Reintentar</button>}</div>}
    {!plan && !error && <p role="status">Cargando tu plan de estudio…</p>}
    {plan && draft && <>
      <form className="home-panel" onSubmit={save}>
        <h2>Configura tu meta</h2>
        {!plan.saved && <p className="home-hint">Esta propuesta usa tus pruebas seleccionadas. Guarda los cambios para conservar tu plan.</p>}
        <label style={{ display:'block',margin:'16px 0' }}>Preguntas diarias (1 a 20)<input type="number" min="1" max="20" required disabled={saving} value={draft.dailyGoal} onChange={e => setDraft({ ...draft,dailyGoal:e.target.value })} style={{ display:'block',padding:8,marginTop:8,width:100 }} /></label>
        <fieldset disabled={saving} style={{ padding:16,border:'1px solid var(--line)',borderRadius:10 }}><legend>Pruebas que quieres preparar</legend>
          {[['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']].map(([id,label]) => <label key={id} style={{ display:'block',padding:'6px 0' }}><input type="checkbox" checked={draft.testIds.includes(id)} onChange={e => setDraft({ ...draft,testIds:e.target.checked ? [...draft.testIds,id] : draft.testIds.filter(test => test !== id) })} /> {label}</label>)}
        </fieldset>
        <p className="home-hint">La meta organiza tu estudio; no modifica tu cuota diaria. La práctica disponible usa dificultad intermedia.</p>
        <button disabled={saving || !draft.testIds.length}>{saving ? 'Guardando…' : 'Guardar plan'}</button>
        {changed && <p className="home-hint">Guarda tus cambios para actualizar las recomendaciones de abajo.</p>}
      </form>
      <section className="home-section home-panel"><h2>Tu objetivo de hoy</h2><p><strong>{plan.completedToday} / {plan.settings.dailyGoal}</strong> preguntas respondidas en las pruebas de este plan.</p><progress aria-label="Avance de la meta diaria" value={Math.min(plan.completedToday,plan.settings.dailyGoal)} max={plan.settings.dailyGoal} />
        <p className="home-hint">Día de estudio: {plan.date} · Hora de Chile</p>
        {plan.remainingGoal === 0 ? <p role="status">¡Cumpliste tu meta de hoy!</p> : plan.quotaRemaining === 0 ? <p>Tu cuota de hoy está agotada. Podrás continuar al comenzar un nuevo día en Chile.</p> : plan.scheduled === 0 ? <p>No hay preguntas nuevas disponibles en las pruebas de tu plan. Puedes elegir otra prueba con contenido disponible.</p> : <p>Te proponemos responder {plan.scheduled} preguntas más hoy{plan.scheduled < plan.remainingGoal ? ', según tu cuota y el contenido disponible' : ''}.</p>}
      </section>
      <section className="home-section"><h2>Recomendaciones por prueba</h2><p className="home-hint">Se distribuyen las preguntas pendientes empezando por las pruebas que conviene reforzar. Es una orientación basada en tus respuestas, no una evaluación de dominio ni un puntaje PAES.</p>
        <div className="home-grid">{plan.tasks.map(task => <article className="home-panel" key={task.testId}><h3>{task.label}</h3><p>{REASONS[task.reason]}</p><p className="home-hint">Historial: {task.answered} respuestas{task.accuracy !== null ? ` · ${task.accuracy}% de aciertos` : ''}. Banco actual: {task.completed} / {task.available} respondidas.</p><p><strong>{task.scheduled}</strong> preguntas propuestas para hoy.</p><button disabled={task.scheduled === 0 || changed || saving} onClick={() => navigate(`/practicar?testId=${task.testId}&difficulty=d2`)}>Practicar {task.label}</button></article>)}</div>
      </section>
      <p className="home-hint">El cumplimiento se actualiza con respuestas guardadas. No necesitas marcar tareas manualmente.</p>
      <button onClick={() => navigate('/')}>Ver mi progreso</button>
    </>}
  </div>;
}
