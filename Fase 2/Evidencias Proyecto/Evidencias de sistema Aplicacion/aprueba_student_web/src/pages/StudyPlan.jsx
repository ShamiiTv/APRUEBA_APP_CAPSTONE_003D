import {useTheme} from '../context/useTheme';
import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import './Home.css';
import './StudyPlan.css';

const REASONS = { unavailable:'Esta prueba aún no tiene preguntas disponibles. Puedes mantenerla en tu plan mientras se amplía el banco.', bank_completed:'Ya respondiste todas las preguntas disponibles de esta prueba.', reinforce:'Conviene reforzar: tus aciertos históricos son menores al 60%, con al menos cinco respuestas.', explore:'Aún hay pocas respuestas para orientar la recomendación. Comienza o continúa explorando esta prueba.', continue:'Continúa avanzando en el banco disponible.' };

export default function StudyPlan() {
  const {lang}=useTheme();
  const localize = value => uiText(lang,value);
  const t = (es,en) => lang==='en' ? en : es;

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
  const maxGoalFor = ids => !plan?.limits ? 20 : (plan.limits.unlimitedAll || ids.includes(plan.limits.unlimitedTestId)) ? plan.limits.paidGoalMax : plan.limits.freeDailyMax;
  const canPracticeTask = task => (task.remaining ?? task.available-task.completed)>0 && (plan.limits?.unlimitedAll || plan.limits?.unlimitedTestId===task.testId || plan.quotaRemaining===null || plan.quotaRemaining>0);
  const maxGoal = maxGoalFor(draft?.testIds || []);
  const selectTest = (id,checked) => setDraft(current=>{
    const testIds=checked?[...current.testIds,id]:current.testIds.filter(test=>test!==id);
    return {...current,testIds,dailyGoal:Math.min(Number(current.dailyGoal)||1,maxGoalFor(testIds))};
  });

  const subjects = [['m1','Matemática M1','Mathematics M1','M1','#7c5cce'],['m2','Matemática M2','Mathematics M2','M2','#3876c5'],['lectora','Competencia Lectora','Reading Comprehension','CL','#c06c2e'],['cien','Ciencias','Science','CI','#16856b'],['hist','Historia','History','HI','#b65c7c']];
  const subject = id => subjects.find(item => item[0]===id) || [id,id,id,'PAES','#3876c5'];
  const goal = plan?.settings.dailyGoal || 1;
  const percent = plan ? Math.min(100,Math.round(plan.completedToday/goal*100)) : 0;
  const studyDate = plan ? new Intl.DateTimeFormat(lang==='en'?'en-GB':'es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${plan.date}T12:00:00Z`)) : '';
  return <div className="home-dashboard study-page">
    <header className="study-heading"><div><span className="study-eyebrow">{t('TU RUTA PAES','YOUR PAES JOURNEY')}</span><h1>{localize('Plan de estudio')}</h1><p>{t('Una meta clara. Un paso más cerca cada día.','A clear goal. One step closer every day.')}</p></div><button className="study-secondary" onClick={refresh} disabled={saving || (!plan && !error)}>{localize('Actualizar progreso')}</button></header>
    {message && <p className="study-feedback" role="status">{message}</p>}
    {error && <div className="home-panel" role="alert"><p>{localize(error)}</p>{!plan && <button onClick={refresh}>{localize('Reintentar')}</button>}</div>}
    {!plan && !error && <ContentSkeleton kind="study-plan" />}
    {plan && draft && <>
      <div className="study-overview">
        <section className="study-today" aria-labelledby="study-today-title">
          <div className="study-today-top"><span className="study-eyebrow">{t('PASO A PASO','STEP BY STEP')}</span><span className="study-date">{studyDate} · Chile</span></div>
          <div className="study-today-main"><div><h2 id="study-today-title">{localize('Tu objetivo de hoy')}</h2><p className="study-count"><strong>{plan.completedToday}</strong><span>/ {goal}</span></p><p>{t('preguntas respondidas en tu plan','questions answered in your plan')}</p></div><div className="study-ring" style={{'--study-progress':`${percent}%`}} aria-hidden="true"><strong>{percent}%</strong></div></div>
          <progress aria-label={localize('Avance de la meta diaria')} value={Math.min(plan.completedToday,goal)} max={goal}/>
          <p className="study-next" role="status">{plan.remainingGoal===0 ? localize('¡Cumpliste tu meta de hoy!') : plan.quotaRemaining===0 && plan.scheduled===0 ? t('Llegaste a tu cuota diaria. Mañana podrás continuar.','You reached your daily quota. Continue tomorrow.') : plan.scheduled===0 ? t('No quedan preguntas nuevas en estas pruebas. Puedes ajustar tu selección.','No new questions remain in these tests. You can change your selection.') : t(`Tu siguiente paso: ${plan.scheduled} ${plan.scheduled===1?'pregunta':'preguntas'} para hoy.`,`Your next step: ${plan.scheduled} ${plan.scheduled===1?'question':'questions'} today.`)}</p>
          <span className="study-today-note">{t('Tu progreso se actualiza al responder.','Your progress updates as you answer.')}</span>
        </section>
        <form className="home-panel study-config" onSubmit={save}>
          <div className="study-section-title"><span className="study-step">01</span><div><h2>{localize('Configura tu meta')}</h2><p>{t('Elige tu ritmo y las pruebas que preparas.','Choose your pace and the tests you are preparing for.')}</p></div></div>
          <div className="study-goal"><label htmlFor="study-goal">{t('Preguntas al día','Questions per day')}<span>{t(`Entre 1 y ${maxGoal}`,`Between 1 and ${maxGoal}`)}</span></label><input id="study-goal" type="number" min="1" max={maxGoal} required disabled={saving} value={draft.dailyGoal} onChange={e=>setDraft({...draft,dailyGoal:e.target.value})}/></div>
          <fieldset disabled={saving} className="study-subjects"><legend>{t('Tus pruebas','Your tests')}</legend>{subjects.map(([id,es,en,,color])=><label key={id} className={draft.testIds.includes(id)?'is-selected':''} style={{'--subject-color':color}}><input type="checkbox" checked={draft.testIds.includes(id)} onChange={e=>selectTest(id,e.target.checked)}/><span className="study-subject-dot" aria-hidden="true"/>{t(es,en)}</label>)}</fieldset>
          <p className="study-config-note">{plan.limits?.unlimitedAll ? t('Práctica sin límite diario en todas las pruebas. La meta es solo tu objetivo personal.','Practice without a daily limit in all tests. The goal is only your personal target.') : plan.limits?.unlimitedTestId ? t(`Sin límite en ${localize(subject(plan.limits.unlimitedTestId)[1])}. Las otras pruebas comparten ${plan.limits.freeDailyMax} preguntas al día.`,`Unlimited ${subject(plan.limits.unlimitedTestId)[2]}. Other tests share ${plan.limits.freeDailyMax} questions per day.`) : t(`Tu cuota habilitada es de ${maxGoal} preguntas al día, compartidas entre todas las pruebas.`,`Your daily quota is ${maxGoal} questions, shared across all tests.`)} {t('La meta no modifica tu acceso a la práctica.','Your goal does not change your practice access.')}</p>
          <button className="study-save" disabled={saving || !draft.testIds.length}>{saving?localize('Guardando…'):localize('Guardar plan')}</button>
          <p className="study-draft" role="status">{plan.goalAdjusted && !changed ? t(`Tu meta guardada de ${plan.requestedGoal} se ajustó a ${goal} según tu acceso actual.`,`Your saved goal of ${plan.requestedGoal} was adjusted to ${goal} for your current access.`) : changed?t('Tienes cambios sin guardar. Guarda para actualizar las recomendaciones.','You have unsaved changes. Save to update recommendations.'):!plan.saved?t('Guarda esta propuesta para conservar tu plan.','Save this suggestion to keep your plan.'):t('Tu plan está guardado. Puedes ajustarlo cuando quieras.','Your plan is saved. You can change it anytime.')}</p>
        </form>
      </div>
      <section className="study-recommendations" aria-labelledby="study-recommendations-title">
        <div className="study-section-title"><span className="study-step">02</span><div><h2 id="study-recommendations-title">{localize('Recomendaciones por prueba')}</h2><p>{t('Empieza por las pruebas que conviene reforzar.','Start with the tests that could use more practice.')}</p></div></div>
        <div className="study-task-grid">{plan.tasks.map(task=>{const [,es,en,short,color]=subject(task.testId);return <article className="home-panel study-task" key={task.testId} style={{'--subject-color':color}}>
          <div className="study-task-heading"><span className="study-subject-icon" aria-hidden="true">{short}</span><div><span className="study-task-status">{task.reason==='reinforce'?t('Para reforzar','Focus area'):task.reason==='unavailable'?t('Próximamente','Coming soon'):task.reason==='bank_completed'?t('Banco completado','Bank completed'):t('Sigue explorando','Keep exploring')}</span><h3>{t(es,en)}</h3></div></div>
          <p className="study-task-reason">{task.reason==='explore'?t('Comienza a practicar para recibir recomendaciones basadas en tus respuestas.','Start practicing to receive recommendations based on your answers.'):localize(REASONS[task.reason])}</p>
          <dl className="study-task-metrics"><div><dt>{t('Respuestas','Answers')}</dt><dd>{task.answered}</dd></div><div><dt>{t('Aciertos históricos','Historical accuracy')}</dt><dd>{task.accuracy===null?'—':`${task.accuracy}%`}</dd></div></dl>
          <div className="study-bank"><span>{t('Banco de preguntas','Question bank')}</span><strong>{task.completed} / {task.available}</strong></div><progress aria-label={t(`Avance en ${es}`,`${en} progress`)} value={task.completed} max={Math.max(1,task.available)}/>
          <div className="study-task-footer"><p><strong>{task.scheduled}</strong><span>{t('para hoy','for today')}</span></p><button disabled={!canPracticeTask(task) || changed || saving} onClick={()=>navigate(`/practicar?testId=${task.testId}&difficulty=d2`)} aria-label={`${localize('Practicar')} ${t(es,en)}`}>{plan.remainingGoal===0?t('Seguir practicando','Keep practicing'):localize('Practicar')} <span aria-hidden="true">→</span></button></div>
        </article>})}</div>
        <details className="study-explanation"><summary>{t('¿Cómo se organiza mi plan?','How is my plan organized?')}</summary><p>{t('Las preguntas pendientes se distribuyen según tus pruebas, tu cuota diaria y el contenido disponible. Con al menos cinco respuestas, se priorizan las pruebas con menos de un 60% de aciertos históricos. Esta orientación no representa un puntaje PAES ni una evaluación de dominio.','Remaining questions are distributed according to your tests, daily quota and available content. With at least five answers, tests with historical accuracy below 60% are prioritized. This guidance is not a PAES score or a mastery assessment.')}</p></details>
      </section>
      <footer className="study-footer"><p>{t('Cada respuesta cuenta. Sigue construyendo tu progreso.','Every answer counts. Keep building your progress.')}</p><button className="study-secondary" onClick={()=>navigate('/')}>{localize('Ver mi progreso')} →</button></footer>
    </>}
  </div>;
}
