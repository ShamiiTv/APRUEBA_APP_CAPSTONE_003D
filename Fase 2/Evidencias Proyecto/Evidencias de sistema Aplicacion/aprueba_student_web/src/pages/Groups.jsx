import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useTheme } from '../context/useTheme';
import { useSocialMutation } from '../hooks/useSocialMutation';
import SocialFeed from '../components/SocialFeed';
import '../components/Social.css';

const SUBJECTS = [['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']];
const accuracy = (value,lang) => value === null || value === undefined ? (lang==='en'?'No practice yet':'Sin práctica registrada') : `${value}%`;

function GroupDetails({ id, questionId, onBack, onLeft }) {
 const {lang}=useTheme();const tr=(es,en)=>lang==='en'?en:es;
  const [group,setGroup] = useState(null);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const [message,setMessage] = useState('');
  const [confirmLeave,setConfirmLeave] = useState(false);
  const [busy,setBusy] = useState(false);
  const guard = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/groups/${encodeURIComponent(id)}`, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) {setGroup(response.data);setError('');}
    }).catch(cause => {if (!controller.signal.aborted) setError(cause.message);});
    return () => controller.abort();
  },[id,revision]);
  const leave = async () => {
    if (guard.current) return;
    guard.current = true;setBusy(true);setMessage('');
    try {
      await apiFetch(`/groups/${id}/leave`, {method:'POST',body:JSON.stringify({})});
      onLeft();
    } catch (cause) {setMessage(cause.message);}
    finally {guard.current = false;setBusy(false);}
  };
  const copy = async (link = false) => {
    try {await navigator.clipboard.writeText(link ? 'https://aprueba.shamiiplay.com/invitacion?codigo='+encodeURIComponent(group.inviteCode || id) : group.inviteCode || id);setMessage(tr('Código de invitación copiado.','Invitation code copied.'));}
    catch {setMessage(tr('No se pudo copiar. Selecciona el código completo que aparece debajo.','Could not copy. Select the full code below.'));}
  };
  return <div>
    <button onClick={onBack}>{tr('Volver a mis grupos','Back to my groups')}</button>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} onClick={()=>setRevision(value=>value+1)}>{tr('Actualizar estadísticas del grupo','Refresh group statistics')}</button>
    {message && <p role="status">{message}</p>}
    {!group && !error && <ContentSkeleton kind="group-detail" />}
    {group && !error && <>
      <h2>{group.name}</h2><p>{group.description}</p><p>{group.visibility==='public'?tr('Grupo público','Public group'):tr('Grupo privado','Private group')}</p><p>{uiText(lang,SUBJECTS.find(([test])=>test===group.subjectTestId)?.[1])} · {group.memberCount} {tr('miembros','members')}</p>
      <section><h3>{tr('Invitar miembros','Invite members')}</h3><p>{tr('Comparte este código completo con quien quieras invitar. El código permite solicitar el ingreso al grupo.','Share this full code with people you want to invite. It allows them to join the group.')}</p><code style={{overflowWrap:'anywhere'}}>{group.inviteCode || id}</code><div className="social-actions"><button onClick={()=>copy(true)}>{tr('Copiar enlace de invitación','Copy invitation link')}</button><button onClick={()=>copy(false)}>{tr('Copiar código completo','Copy full invitation code')}</button><button disabled={busy} onClick={()=>setConfirmLeave(true)}>{tr('Salir del grupo','Leave group')}</button></div>
        {confirmLeave && <div role="group" aria-label={tr('Confirmar salida','Confirm leaving')}><p>{tr('¿Salir del grupo? Si eres líder, el primer miembro restante será el nuevo líder. Si no quedan miembros, el grupo se cerrará.','Leave this group? If you are the leader, the first remaining member becomes the leader. Empty groups close.')}</p><button disabled={busy} onClick={leave}>{tr('Confirmar salida','Confirm leaving')}</button> <button disabled={busy} onClick={()=>setConfirmLeave(false)}>{tr('Cancelar salida','Cancel leaving')}</button></div>}
      </section>
      <section><h3>{tr('Estadísticas de práctica','Practice statistics')}</h3>
        <p>{tr('Respuestas correctas del grupo','Group correct answers')}: <strong>{accuracy(group.statistics.accuracy,lang)}</strong> · {tr('Tu resultado','Your result')}: <strong>{accuracy(group.statistics.myAccuracy,lang)}</strong></p>
        <p>{tr(`${group.statistics.correct} correctas de ${group.statistics.answered} primeras respuestas en la materia. Incluye práctica anterior al ingreso; no es puntaje PAES.`,`${group.statistics.correct} correct of ${group.statistics.answered} first answers in this subject. Includes practice before joining; not a PAES score.`)}</p>
        <div className="social-table"><table><thead><tr><th>{tr('Miembro','Member')}</th><th>{tr('Rol','Role')}</th><th>{tr('Respuestas','Answers')}</th><th>{tr('Correctas','Correct')}</th></tr></thead><tbody>{group.members.map(member=><tr key={member.uid}><td>{member.name}</td><td>{member.role==='owner'?tr('Líder','Leader'):tr('Miembro','Member')}</td><td>{member.answered}</td><td>{accuracy(member.accuracy,lang)}</td></tr>)}</tbody></table></div>
      </section>
      <h3>{tr('Preguntas compartidas y conversación','Shared questions and discussion')}</h3>
      <SocialFeed key={id} groupId={id} questionId={questionId} />
    </>}
  </div>;
}

export default function Groups() {
  const { t,lang } = useTheme();const tr=(es,en)=>lang==='en'?en:es;
  const [params,setParams] = useSearchParams();
  const selected = params.get('groupId');
  const questionId = params.get('questionId');
  const requestedTest = params.get('testId');
  const [groups,setGroups] = useState(null);
  const [limit,setLimit] = useState(null);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const invitation = params.get('invite') || sessionStorage.getItem('aprueba:group-invitation') || '';
  const [panel,setPanel] = useState(invitation ? 'join' : '');
  const [name,setName] = useState('');
  const [visibility,setVisibility]=useState('private');
  const [description,setDescription]=useState('');
  const [publicGroups,setPublicGroups]=useState([]);
  const [test,setTest] = useState(SUBJECTS.some(([id])=>id===requestedTest)?requestedTest:'m1');
  const [code,setCode] = useState(invitation);
  useEffect(()=>{sessionStorage.removeItem('aprueba:group-invitation');},[]);
  const [joining,setJoining] = useState(false);
  const guard = useRef(false);
  const create = useSocialMutation('/groups','create-group');
  const alive = useRef(false);
  const load = useCallback(async () => {
    try {
      const [response,directory] = await Promise.all([apiFetch('/groups'),apiFetch('/groups/public')]);
      if (!alive.current) return;
      setPublicGroups(directory.data);
      setGroups(response.data);setLimit(response.meta?.groupLimit ?? null);setError('');
    } catch (cause) {if (alive.current) setError(cause.message);}
  },[]);
  useEffect(()=>{
    alive.current=true;
    queueMicrotask(()=>{if(alive.current)load();});
    return ()=>{alive.current=false;};
  },[load]);
  const open = id => {
    const next = new URLSearchParams(params);
    next.delete('invite');if(id)next.set('groupId',id);else next.delete('groupId');
    setParams(next);
  };
  const createGroup = async event => {
    event.preventDefault();
    const response = await create.run({name,subjectTestId:test,visibility,description});
    if(!response)return;
    setName('');setPanel('');setMessage(tr('Grupo creado. Comparte el código completo para invitar miembros.','Group created. Share the full invitation code.'));
    await load();open(response.data.id);
  };
  const join = async event => {
    event.preventDefault();
    if(guard.current)return;
    guard.current=true;setJoining(true);setMessage('');
    try {
      const response=await apiFetch('/groups/join',{method:'POST',body:JSON.stringify({groupId:(()=>{try{const url=new URL(code.trim());return url.origin==='https://aprueba.shamiiplay.com' && url.pathname==='/invitacion' ? url.searchParams.get('codigo') || '' : code.trim();}catch{return code.trim();}})()})});
      setCode('');setPanel('');setMessage(response.data.alreadyMember?tr('Ya perteneces a este grupo.','You already belong to this group.'):tr('Te uniste al grupo.','You joined the group.'));
      await load();open(response.data.id);
    } catch(cause){setMessage(cause.message);}
    finally{guard.current=false;setJoining(false);}
  };
  if(selected)return <div className="social-page groups-page"><h1>{t.groups.title}</h1><GroupDetails key={selected} id={selected} questionId={questionId} onBack={()=>open(null)} onLeft={()=>{open(null);setMessage(tr('Saliste del grupo.','You left the group.'));load();}} /></div>;
  return <div className="social-page groups-page">
    <h1>{t.groups.title}</h1><p>{t.groups.subtitle}</p>
    {questionId && <p>{tr('Elige un grupo de la materia para compartir la pregunta de práctica con una duda o aporte.','Choose a group for this subject to share your practice question.')}</p>}
    {limit!==null && <p>{tr('Grupos','Groups')}: {groups?.length ?? 0} · {limit===0?tr('Tu plan no limita la cantidad de grupos.','Your plan has no group count limit.'):tr(`Límite de tu plan: ${limit}.`,`Your plan limit: ${limit}.`)}</p>}
    <div className="social-actions"><button disabled={create.busy || joining} onClick={()=>setPanel('create')}>＋ {tr('Crear grupo','Create group')}</button><button disabled={create.busy || joining} onClick={()=>setPanel('join')}>{tr('Unirse con código','Join with code')}</button><button disabled={create.busy || joining} onClick={load}>{tr('Actualizar grupos','Refresh groups')}</button></div>
    <section><h2>{tr('Descubrir grupos públicos','Discover public groups')}</h2>{!groups && !error ? <ContentSkeleton kind="groups" /> : publicGroups.length ? publicGroups.map(group=><article key={group.id}><strong>{group.name}</strong><p>{group.description}</p><p>{group.memberCount} {tr('miembros','members')}</p>{groups?.some(mine=>mine.id===group.id) ? <><span className="group-membership">{tr('Ya eres miembro','Already a member')}</span><button onClick={()=>open(group.id)}>{tr('Abrir mi grupo','Open my group')} →</button></> : <button onClick={()=>{setCode(group.id);setPanel('join');}}>{tr('Unirme al grupo','Join group')} →</button>}</article>):<p>{tr('Sin grupos públicos todavía','No public groups yet')}</p>}</section>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{create.error && <p role="alert">{create.error}</p>}
    {(panel==='create' || create.pending) && <form onSubmit={createGroup}><h2>{tr('Crear grupo de estudio','Create a study group')}</h2>
      <label htmlFor="group-name">{tr('Nombre del grupo','Group name')}</label><input id="group-name" required maxLength={100} value={create.pending?.name ?? name} disabled={create.busy || !!create.pending} onChange={event=>setName(event.target.value)} />
      <label>{tr('Privacidad','Visibility')}<select disabled={create.busy || !!create.pending} value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="private">{tr('Privado','Private')}</option><option value="public">{tr('Público','Public')}</option></select></label>
      <label>{tr('Descripción','Description')}<textarea maxLength={500} disabled={create.busy || !!create.pending} value={description} onChange={e=>setDescription(e.target.value)} /></label>
      <label htmlFor="group-test">{tr('Materia principal','Main subject')}</label><select id="group-test" value={create.pending?.subjectTestId ?? test} disabled={create.busy || !!create.pending} onChange={event=>setTest(event.target.value)}>{SUBJECTS.map(([id,label])=><option key={id} value={id}>{uiText(lang,label)}</option>)}</select>
      <div className="social-actions"><button disabled={create.busy || (!create.pending && !name.trim())}>{create.pending?tr('Reintentar creación','Retry creation'):tr('Crear e invitar','Create and invite')}</button>{!create.pending && <button type="button" onClick={()=>setPanel('')}>{tr('Cancelar','Cancel')}</button>}</div>
    </form>}
    {panel==='join' && !create.pending && <form onSubmit={join}><h2>{tr('Unirse a un grupo','Join a group')}</h2><label htmlFor="group-code">{tr('Enlace o código completo del grupo','Group link or full code')}</label><input id="group-code" required maxLength={500} value={code} disabled={joining} onChange={event=>setCode(event.target.value)} /><div className="social-actions"><button disabled={joining || !code.trim()}>{tr('Unirse al grupo','Join group')}</button><button type="button" disabled={joining} onClick={()=>setPanel('')}>{tr('Cancelar','Cancel')}</button></div></form>}
    {!groups && !error && <ContentSkeleton kind="groups" />}
    {groups?.length===0 && <p>{tr('Aún no perteneces a ningún grupo. Crea uno o únete con una invitación.','You have no groups yet. Create one or join with an invitation.')}</p>}
    <h2 style={{marginTop:24}}>{tr('Mis grupos','My groups')}</h2><div className="social-groups">{groups?.map(group=><article key={group.id}><h2>{group.name}</h2><p>{SUBJECTS.find(([id])=>id===group.subjectTestId)?.[1]} · {group.memberCount} {tr('miembros','members')}</p><p>{group.role==='owner'?tr('Eres líder de este grupo.','You lead this group.'):tr('Eres miembro de este grupo.','You are a member of this group.')}</p><button onClick={()=>open(group.id)}>{tr('Abrir','Open')} {group.name}</button></article>)}</div>
  </div>;
}
