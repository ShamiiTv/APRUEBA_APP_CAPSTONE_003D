import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import './Settings.css';

const TESTS = [['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']];
const COPY = {
  es:{ title:'Perfil y ajustes',description:'Actualiza tus datos y las preferencias de tu cuenta.',profile:'Tu perfil',name:'Nombre',email:'Correo de la cuenta',school:'Colegio o institución (opcional)',region:'Región (opcional)',practice:'Preferencias de práctica',tests:'Pruebas que preparas',difficulty:'Dificultad preferida',basic:'Básica',medium:'Intermedia',advanced:'Avanzada',bankHint:'El banco actual tiene preguntas de nivel intermedio. Las otras dificultades pueden no tener contenido disponible.',planHint:'Estas pruebas se usan para comenzar la práctica y proponer un plan nuevo. Tu plan de estudio guardado tiene su propia selección.',appearance:'Apariencia e idioma',theme:'Tema',light:'Claro',dark:'Oscuro',language:'Idioma de la interfaz',applyHint:'El tema y el idioma se aplicarán cuando guardes los cambios. Las preguntas conservan su idioma original.',reminder:'Preferencia de recordatorio diario',reminderHint:'Preferencia para futuros recordatorios. El servicio de envío aún no está disponible.',save:'Guardar cambios',saving:'Guardando…',saved:'Tu perfil y preferencias quedaron guardados.',discard:'Descartar cambios',pending:'Tienes cambios sin guardar.',password:'Restablecer contraseña',accountHint:'El correo identifica tu cuenta. Puedes restablecer la contraseña mediante un enlace enviado a ese correo.',emptyTests:'Selecciona al menos una prueba.',emptyName:'Escribe tu nombre.',plan:'Ver mi plan de estudio' },
  en:{ title:'Profile and settings',description:'Update your information and account preferences.',profile:'Your profile',name:'Name',email:'Account email',school:'School or institution (optional)',region:'Region (optional)',practice:'Practice preferences',tests:'Tests you are preparing for',difficulty:'Preferred difficulty',basic:'Basic',medium:'Intermediate',advanced:'Advanced',bankHint:'The current bank contains intermediate questions. Other difficulties may have no available content.',planHint:'These tests are used to start practice and suggest a new study plan. Your saved study plan has its own selection.',appearance:'Appearance and language',theme:'Theme',light:'Light',dark:'Dark',language:'Interface language',applyHint:'Theme and language apply when you save changes. Questions keep their original language.',reminder:'Daily reminder preference',reminderHint:'Preference for future reminders. The delivery service is not available yet.',save:'Save changes',saving:'Saving…',saved:'Your profile and preferences were saved.',discard:'Discard changes',pending:'You have unsaved changes.',password:'Reset password',accountHint:'Your email identifies your account. You can reset your password through a link sent to that email.',emptyTests:'Select at least one test.',emptyName:'Enter your name.',plan:'View my study plan' },
};
function profileDraft(user) {
  const selected = Array.isArray(user?.selectedTests) ? [...new Set(user.selectedTests.filter(id => TESTS.some(([testId]) => testId === id)))] : [];
  return { name:user?.name || '',school:user?.school || '',region:user?.region || '',selectedTests:selected.length ? selected : ['lectora','m1'],difficulty:['d1','d2','d3'].includes(user?.difficulty) ? user.difficulty : 'd2',theme:user?.theme === 'dark' ? 'dark' : 'light',locale:user?.locale === 'en' ? 'en' : 'es',dailyReminder:user?.dailyReminder === true };
}

export default function Settings() {
  const { user,saveProfile } = useAuth();
  const { lang } = useTheme();
  const copy = COPY[lang] || COPY.es;
  const [draft,setDraft] = useState(() => profileDraft(user));
  const [touched,setTouched] = useState([]);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState(false);
  const submission = useRef(false);
  const current = profileDraft(user);
  const values = { ...current,...Object.fromEntries(touched.map(field => [field,draft[field]])) };
  const patch = Object.fromEntries(touched.filter(field => JSON.stringify(values[field]) !== JSON.stringify(current[field])).map(field => [field,values[field]]));
  const dirty = Object.keys(patch).length > 0;
  const change = (field,value) => { setDraft(prev => ({ ...prev,[field]:value }));setTouched(prev => [...new Set([...prev,field])]);setSuccess(false);setError(''); };
  const discard = () => { setDraft(profileDraft(user));setTouched([]);setSuccess(false);setError(''); };

  const save = async event => {
    event.preventDefault();
    if (submission.current || !dirty) return;
    if (!values.name.trim()) { setError(copy.emptyName);return; }
    if (!values.selectedTests.length) { setError(copy.emptyTests);return; }
    submission.current = true;setSaving(true);setError('');setSuccess(false);
    try {
      const saved = await saveProfile(patch);
      const next = profileDraft(saved);
      setDraft(next);setTouched([]);setSuccess(true);
    } catch(err) { setError(err.message); }
    finally { submission.current = false;setSaving(false); }
  };

  return <div className="settings-page">
    <h1>{copy.title}</h1><p className="settings-hint">{copy.description}</p>
    {error && <p role="alert" className="settings-error">{error}</p>}
    {success && <p role="status" className="settings-success">{copy.saved}</p>}
    <form onSubmit={save}>
      <fieldset disabled={saving}><legend>{copy.profile}</legend>
        <label>{copy.name}<input autoComplete="name" required maxLength={120} value={values.name} onChange={e => change('name',e.target.value)} /></label>
        <label>{copy.email}<input type="email" readOnly value={user?.email || ''} /></label>
        <label>{copy.school}<input maxLength={200} value={values.school} onChange={e => change('school',e.target.value)} /></label>
        <label>{copy.region}<input maxLength={100} value={values.region} onChange={e => change('region',e.target.value)} /></label>
        <p className="settings-hint">{copy.accountHint}</p><Link to="/recuperar-contrasena">{copy.password}</Link>
      </fieldset>
      <fieldset disabled={saving}><legend>{copy.practice}</legend>
        <div role="group" aria-label={copy.tests}><p>{copy.tests}</p>{TESTS.map(([id,label]) => <label className="settings-check" key={id}><input type="checkbox" checked={values.selectedTests.includes(id)} onChange={e => change('selectedTests',e.target.checked ? [...values.selectedTests,id] : values.selectedTests.filter(test => test !== id))} />{label}</label>)}</div>
        <div><label htmlFor="profile-difficulty">{copy.difficulty}</label><select id="profile-difficulty" value={values.difficulty} onChange={e => change('difficulty',e.target.value)}><option value="d1">{copy.basic}</option><option value="d2">{copy.medium}</option><option value="d3">{copy.advanced}</option></select></div>
        <p className="settings-hint">{copy.bankHint}</p><p className="settings-hint">{copy.planHint}</p><Link to="/plan-estudio">{copy.plan}</Link>
      </fieldset>
      <fieldset disabled={saving}><legend>{copy.appearance}</legend>
        <div><label htmlFor="profile-theme">{copy.theme}</label><select id="profile-theme" value={values.theme} onChange={e => change('theme',e.target.value)}><option value="light">{copy.light}</option><option value="dark">{copy.dark}</option></select></div>
        <div><label htmlFor="profile-language">{copy.language}</label><select id="profile-language" value={values.locale} onChange={e => change('locale',e.target.value)}><option value="es">Español</option><option value="en">English</option></select></div>
        <p className="settings-hint">{copy.applyHint}</p>
        <label className="settings-check"><input type="checkbox" checked={values.dailyReminder} onChange={e => change('dailyReminder',e.target.checked)} />{copy.reminder}</label><p className="settings-hint">{copy.reminderHint}</p>
      </fieldset>
      {dirty && <p className="settings-hint">{copy.pending}</p>}
      <div className="settings-actions"><button type="submit" disabled={saving || !dirty}>{saving ? copy.saving : copy.save}</button><button type="button" disabled={saving || !dirty} onClick={discard}>{copy.discard}</button></div>
    </form>
  </div>;
}
