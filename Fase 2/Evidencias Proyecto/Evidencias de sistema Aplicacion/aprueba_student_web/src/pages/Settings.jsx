import ApruebaIcon from '../components/ApruebaIcon';
import SectionHeader from '../components/SectionHeader';
import { useEffect,useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import './Settings.css';
import {uiText} from '../i18n/uiText';
import AccountSecurity from '../components/AccountSecurity';
import { apiFetch } from '../api/client';

const TESTS = [['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']];
const COPY = {
  es:{ title:'Perfil y ajustes',description:'Actualiza tus datos y las preferencias de tu cuenta.',profile:'Tu perfil',name:'Nombre',email:'Correo de la cuenta',school:'Colegio o institución (opcional)',region:'Región (opcional)',practice:'Preferencias de práctica',tests:'Pruebas que preparas',difficulty:'Dificultad preferida',basic:'Básica',medium:'Intermedia',advanced:'Avanzada',bankHint:'El banco actual tiene preguntas de nivel intermedio. Las otras dificultades pueden no tener contenido disponible.',planHint:'Estas pruebas se usan para comenzar la práctica y proponer un plan nuevo. Tu plan de estudio guardado tiene su propia selección.',appearance:'Apariencia e idioma',theme:'Tema',light:'Claro',dark:'Oscuro',language:'Idioma de la interfaz',applyHint:'El tema y el idioma se aplicarán cuando guardes los cambios. Las preguntas conservan su idioma original.',reminder:'Preferencia de recordatorio diario',reminderHint:'Preferencia para futuros recordatorios. El servicio de envío aún no está disponible.',save:'Guardar cambios',saving:'Guardando…',saved:'Tu perfil y preferencias quedaron guardados.',discard:'Descartar cambios',pending:'Tienes cambios sin guardar.',password:'Restablecer contraseña',accountHint:'El correo identifica tu cuenta. Puedes restablecer la contraseña mediante un enlace enviado a ese correo.',emptyTests:'Selecciona al menos una prueba.',emptyName:'Escribe tu nombre.',plan:'Ver mi plan de estudio' },
  en:{ title:'Profile and settings',description:'Update your information and account preferences.',profile:'Your profile',name:'Name',email:'Account email',school:'School or institution (optional)',region:'Region (optional)',practice:'Practice preferences',tests:'Tests you are preparing for',difficulty:'Preferred difficulty',basic:'Basic',medium:'Intermediate',advanced:'Advanced',bankHint:'The current bank contains intermediate questions. Other difficulties may have no available content.',planHint:'These tests are used to start practice and suggest a new study plan. Your saved study plan has its own selection.',appearance:'Appearance and language',theme:'Theme',light:'Light',dark:'Dark',language:'Interface language',applyHint:'Theme and language apply when you save changes. Questions keep their original language.',reminder:'Daily reminder preference',reminderHint:'Preference for future reminders. The delivery service is not available yet.',save:'Save changes',saving:'Saving…',saved:'Your profile and preferences were saved.',discard:'Discard changes',pending:'You have unsaved changes.',password:'Reset password',accountHint:'Your email identifies your account. You can reset your password through a link sent to that email.',emptyTests:'Select at least one test.',emptyName:'Enter your name.',plan:'View my study plan' },
};
function profileDraft(user) {
  const selected = Array.isArray(user?.selectedTests) ? [...new Set(user.selectedTests.filter(id => TESTS.some(([testId]) => testId === id)))] : [];
  return { name:user?.name || '',school:user?.school || '',region:user?.region || '',age:user?.age ?? '',phone:user?.phone || '',address:user?.address || {commune:'',street:''},selectedTests:selected.length ? selected : ['lectora','m1'],difficulty:['d1','d2','d3'].includes(user?.difficulty) ? user.difficulty : 'd2',theme:user?.theme === 'dark' ? 'dark' : 'light',locale:user?.locale === 'en' ? 'en' : 'es',dailyReminder:user?.dailyReminder === true,reminderTime:user?.reminderTime || '20:00' };
}

export default function Settings() {
  const { user,saveProfile,updateUserState } = useAuth();
  const { lang } = useTheme();
  const copy = COPY[lang] || COPY.es;
  const [draft,setDraft] = useState(() => profileDraft(user));
  const [touched,setTouched] = useState([]);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState(false);
  const submission = useRef(false);
  const [socialBusy,setSocialBusy]=useState(false);
  const [verificationMessage,setVerificationMessage]=useState('');
  const connect=async provider=>{setSocialBusy(true);setError('');try{const session=await apiFetch('/auth/social-session',{method:'POST',body:JSON.stringify({currentPassword:verificationPassword})});await window.apruebaLinkProvider(JSON.stringify(session.data),provider);await refreshVerification();setVerificationPassword('');setVerificationMessage(lang==='en'?'Account linked. Refresh your profile.':'Cuenta vinculada. Actualiza tu perfil.');}catch{setError(lang==='en'?'Could not link the account. Check the password, allow popups, and confirm the provider is enabled in Firebase.':'No se pudo vincular. Revisa la contraseña, permite ventanas emergentes y confirma que el proveedor está habilitado en Firebase.');}finally{setSocialBusy(false);}};
  const [verificationPassword,setVerificationPassword]=useState('');
  const verify=async()=>{setSaving(true);setError('');try{await apiFetch('/auth/verify-email',{method:'POST',body:JSON.stringify({currentPassword:verificationPassword})});setVerificationPassword('');setVerificationMessage(lang==='en'?'Verification email sent. Follow the link, then refresh your profile.':'Correo de verificación enviado. Abre el enlace y actualiza tu perfil.');}catch(err){setError(err.message);}finally{setSaving(false);}};
  useEffect(()=>{const controller=new AbortController();apiFetch('/auth/me',{signal:controller.signal}).then(res=>updateUserState(res.data)).catch(()=>{});return()=>controller.abort();},[updateUserState]);
  const refreshVerification=async()=>{try{const res=await apiFetch('/auth/me');updateUserState(res.data);}catch(err){setError(err.message);}};
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
      const payload={...patch};if('age' in payload)payload.age=payload.age===''?null:Number(payload.age);
      const saved = await saveProfile(payload);
      const next = profileDraft(saved);
      setDraft(next);setTouched([]);setSuccess(true);
    } catch(err) { setError(err.message); }
    finally { submission.current = false;setSaving(false); }
  };

  return <div className="settings-page">
    <SectionHeader icon="settings" title={copy.title}>{copy.description}</SectionHeader>
    {error && <p role="alert" className="settings-error">{error}</p>}
    {verificationMessage && <p role="status" className="settings-success">{verificationMessage}</p>}
    {success && <p role="status" className="settings-success">{copy.saved}</p>}
    <section className="account-status"><div><h2>{lang==='en'?'Account email':'Correo de la cuenta'}</h2><p>{user?.email}</p></div><strong className="status-pill">{user?.emailVerified?(lang==='en'?'Verified':'Verificado'):(lang==='en'?'Pending verification':'Pendiente de verificación')}</strong>
      {!user?.emailVerified && <div className="verify-controls"><label>{lang==='en'?'Current password':'Contraseña actual'}<input type="password" autoComplete="current-password" value={verificationPassword} onChange={e=>setVerificationPassword(e.target.value)} /></label><button disabled={saving || socialBusy || !verificationPassword} onClick={verify}>{lang==='en'?'Send verification email':'Enviar correo de verificación'}</button><button disabled={saving || socialBusy} onClick={refreshVerification}>{lang==='en'?'Refresh verification':'Actualizar verificación'}</button></div>}
    </section>
    <section className="account-links"><h2>{lang==='en'?'Sign-in accounts':'Cuentas de acceso'}</h2>
      <p>{lang==='en'?'Link a provider to sign in to this profile.':'Vincula una cuenta para iniciar sesión con ella.'}</p>
      {user?.emailVerified && user?.availableSocialProviders?.some(id=>!user?.linkedProviders?.includes(id)) && <label>{lang==='en'?'Current password':'Contraseña actual'}<input type="password" autoComplete="current-password" value={verificationPassword} onChange={e=>setVerificationPassword(e.target.value)} /></label>}
      {['google.com','facebook.com'].map(provider=><button key={provider} disabled={socialBusy || saving || !verificationPassword || !user?.availableSocialProviders?.includes(provider) || user?.linkedProviders?.includes(provider)} onClick={()=>connect(provider)}>{user?.linkedProviders?.includes(provider)?'✓ ':''}{provider==='google.com'?'Google':'Facebook'}{!user?.availableSocialProviders?.includes(provider) && (lang==='en'?' · pending setup':' · pendiente de configuración')}</button>)}
    </section>
    <form onSubmit={save}>
      <fieldset className="pref-card pref-profile" disabled={saving}><legend><ApruebaIcon name="group" size={21} />{copy.profile}</legend>
        <label>{copy.name}<input autoComplete="name" required maxLength={120} value={values.name} onChange={e => change('name',e.target.value)} /></label>
        <label>{copy.email}<input type="email" readOnly value={user?.email || ''} /></label>
        <label>{copy.school}<input maxLength={200} value={values.school} onChange={e => change('school',e.target.value)} /></label>
        <label>{copy.region}<input maxLength={100} value={values.region} onChange={e => change('region',e.target.value)} /></label>
        <label>{lang==='en'?'Age':'Edad'}<input type="number" min="10" max="99" value={values.age} onChange={e=>change('age',e.target.value)} /></label>
        <label>{lang==='en'?'Phone (optional, not verified)':'Celular (opcional, sin verificar)'}<input type="tel" value={values.phone} onChange={e=>change('phone',e.target.value)} /></label>
        <p>{lang==='en'?'10 base + 5 school/age/region + 5 address · 20 free max':'10 base + 5 colegio/edad/región + 5 dirección · 20 máx gratis'}</p>
        <label>{lang==='en'?'Commune':'Comuna'}<input maxLength={200} value={values.address.commune || ''} onChange={e=>change('address',{...values.address,commune:e.target.value})} /></label>
        <label>{lang==='en'?'Street and number':'Calle y número'}<input maxLength={200} value={values.address.street || ''} onChange={e=>change('address',{...values.address,street:e.target.value})} /></label>
        <label>{lang==='en'?'Country':'País'}<input maxLength={200} value={values.address.country || ''} onChange={e=>change('address',{...values.address,country:e.target.value})}/></label><label>{lang==='en'?'Housing type':'Tipo de vivienda'}<select value={values.address.housingType || 'casa'} onChange={e=>change('address',{...values.address,housingType:e.target.value})}>{['casa','departamento','condominio','otro'].map(v=><option key={v} value={v}>{lang==='en'?{casa:'House',departamento:'Apartment',condominio:'Condominium',otro:'Other'}[v]:v}</option>)}</select></label><label>{lang==='en'?'Unit (optional)':'Unidad (opcional)'}<input maxLength={200} value={values.address.unit || ''} onChange={e=>change('address',{...values.address,unit:e.target.value})}/></label><p className="settings-hint">{copy.accountHint}</p><Link className="settings-shortcut" to="/recuperar-contrasena"><ApruebaIcon name="lock" size={16} />{copy.password}</Link>
      </fieldset>
      <fieldset className="pref-card pref-practice" disabled={saving}><legend><ApruebaIcon name="target" size={21} />{copy.practice}</legend>
        <div className="subject-picker" role="group" aria-label={copy.tests}><p>{copy.tests}</p>{TESTS.map(([id,label]) => <label className="settings-check" key={id}><input type="checkbox" checked={values.selectedTests.includes(id)} onChange={e => change('selectedTests',e.target.checked ? [...values.selectedTests,id] : values.selectedTests.filter(test => test !== id))} />{uiText(lang,label)}</label>)}</div>
        <div><label htmlFor="profile-difficulty">{copy.difficulty}</label><select id="profile-difficulty" value={values.difficulty} onChange={e => change('difficulty',e.target.value)}><option value="d1">{copy.basic}</option><option value="d2">{copy.medium}</option><option value="d3">{copy.advanced}</option></select></div>
        <p className="settings-hint">{lang==='en'?'Current question bank: intermediate difficulty.':'Banco actual: dificultad intermedia.'}</p><p className="settings-hint">{lang==='en'?'These choices apply to practice and new plans. Your saved plan keeps its subjects.':'Esta selección se usa al practicar y al crear un plan. Tu plan guardado conserva sus materias.'}</p><Link className="settings-shortcut" to="/plan-estudio"><ApruebaIcon name="book" size={16} />{copy.plan}</Link>
      </fieldset>
      <fieldset className="pref-card pref-appearance" disabled={saving}><legend><ApruebaIcon name="sun" size={21} />{copy.appearance}</legend>
        <div><label htmlFor="profile-theme">{copy.theme}</label><select id="profile-theme" value={values.theme} onChange={e => change('theme',e.target.value)}><option value="light">{copy.light}</option><option value="dark">{copy.dark}</option></select></div>
        <div><label htmlFor="profile-language">{copy.language}</label><select id="profile-language" value={values.locale} onChange={e => change('locale',e.target.value)}><option value="es">Español</option><option value="en">English</option></select></div>
        <p className="settings-hint">{copy.applyHint}</p>
        <label className="settings-check"><input type="checkbox" checked={values.dailyReminder} onChange={e => change('dailyReminder',e.target.checked)} />{copy.reminder}</label><label>{lang==='en'?'Reminder time':'Hora del recordatorio'}<input type="time" value={values.reminderTime} onChange={e=>change('reminderTime',e.target.value)}/></label><p className="settings-hint">{lang==='en'?'This preference syncs with Android. Browsers do not schedule the native reminder.':'Esta preferencia se sincroniza con Android. El navegador no programa el recordatorio nativo.'}</p>
      </fieldset>
      {dirty && <p className="settings-hint">{copy.pending}</p>}
      <div className="settings-actions"><button type="submit" disabled={saving || !dirty}>{saving ? copy.saving : copy.save}</button><button type="button" disabled={saving || !dirty} onClick={discard}>{copy.discard}</button></div>
    </form>
    <AccountSecurity />
  </div>;
}
