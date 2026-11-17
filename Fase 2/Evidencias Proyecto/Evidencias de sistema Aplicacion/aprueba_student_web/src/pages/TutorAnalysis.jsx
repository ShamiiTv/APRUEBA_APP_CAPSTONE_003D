import {uiText} from '../i18n/uiText';
import {Link} from 'react-router-dom';
import {useTheme} from '../context/useTheme';
import {useApiResource} from '../hooks/useApiResource';
import {hasTutorAccess} from '../features/access';
import ContentSkeleton from '../components/ContentSkeleton';
import '../components/Parity.css';
export default function TutorAnalysis(){
 const {lang}=useTheme(),en=lang==='en';const profile=useApiResource('/auth/me');
 const allowed=hasTutorAccess(profile.data);const progress=useApiResource(allowed?'/progress':null);
 if(profile.loading)return <ContentSkeleton kind="cards"/>;
 if(profile.error)return <section role="alert"><p>{profile.error}</p><button onClick={profile.refresh}>{en?'Retry':'Reintentar'}</button></section>;
 if(!allowed)return <section className="parity-panel parity-page"><h1>{en?'Unlock Tutors':'Desbloquea los Tutores'}</h1><p>{en?'Tutoring requests and analysis require a valid All tests plan ($4,990).':'Las solicitudes de tutoría y el análisis requieren el plan Todas las pruebas vigente ($4.990).'}</p><Link to="/plan">{en?'View demo plans':'Ver planes de demostración'}</Link></section>;
 const rows=(progress.data?.subjects||[]).filter(s=>!profile.data.selectedTests?.length||profile.data.selectedTests.includes(s.testId)).toSorted((a,b)=>(a.accuracy??101)-(b.accuracy??101));
 return <section className="parity-page"><h1>{en?'Weakness analysis':'Análisis de debilidades'}</h1><p>{en?'Historical accuracy is guidance, not a PAES score or a diagnosis of mastery.':'Los aciertos históricos orientan tu práctica; no son puntaje PAES ni diagnóstico de dominio.'}</p>{progress.loading&&<ContentSkeleton kind="cards"/>}{progress.error&&<p role="alert">{progress.error}</p>}<button onClick={progress.refresh}>{en?'Refresh':'Actualizar'}</button>{progress.data?.answered===0&&<p>{en?'Answer questions to start your analysis.':'Responde preguntas para comenzar tu análisis.'}</p>}<div className="parity-grid">{rows.map(s=><article className="parity-panel" key={s.testId}><h2>{uiText(lang,s.label)}</h2><p>{s.accuracy===null?(en?'No answers yet':'Sin respuestas aún'):`${s.accuracy}% ${en?'correct':'de aciertos'}`}</p><p>{s.correct} / {s.answered} {en?'historical answers':'respuestas históricas'}</p><Link to={`/tutores?testId=${s.testId}`}>{en?'See tutors':'Ver tutores'}</Link></article>)}</div></section>;
}
