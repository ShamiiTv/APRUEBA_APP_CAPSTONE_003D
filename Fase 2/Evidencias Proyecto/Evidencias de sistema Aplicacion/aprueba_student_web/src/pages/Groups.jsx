import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useTheme } from '../context/useTheme';
import { useSocialMutation } from '../hooks/useSocialMutation';
import SocialFeed from '../components/SocialFeed';
import '../components/Social.css';

const SUBJECTS = [['m1','Matemática M1'],['m2','Matemática M2'],['lectora','Competencia Lectora'],['cien','Ciencias'],['hist','Historia']];
const accuracy = value => value === null || value === undefined ? 'Sin práctica registrada' : `${value}%`;

function GroupDetails({ id, questionId, onBack, onLeft }) {
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
  const copy = async () => {
    try {await navigator.clipboard.writeText(id);setMessage('Código de invitación copiado.');}
    catch {setMessage('No se pudo copiar. Selecciona el código completo que aparece debajo.');}
  };
  return <div>
    <button onClick={onBack}>Volver a mis grupos</button>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} onClick={()=>setRevision(value=>value+1)}>Actualizar estadísticas del grupo</button>
    {message && <p role="status">{message}</p>}
    {!group && !error && <p>Cargando grupo...</p>}
    {group && !error && <>
      <h2>{group.name}</h2><p>{SUBJECTS.find(([test])=>test===group.subjectTestId)?.[1]} · {group.memberCount} miembros</p>
      <section><h3>Invitar miembros</h3><p>Comparte este código completo con quien quieras invitar. El código permite solicitar el ingreso al grupo.</p><code>{id}</code><div className="social-actions"><button onClick={copy}>Copiar código completo</button><button disabled={busy} onClick={()=>setConfirmLeave(true)}>Salir del grupo</button></div>
        {confirmLeave && <div role="group" aria-label="Confirmar salida"><p>¿Salir del grupo? Si eres líder, el primer miembro restante será el nuevo líder. Si no quedan miembros, el grupo se cerrará.</p><button disabled={busy} onClick={leave}>Confirmar salida</button> <button disabled={busy} onClick={()=>setConfirmLeave(false)}>Cancelar salida</button></div>}
      </section>
      <section><h3>Estadísticas de práctica</h3>
        <p>Respuestas correctas del grupo: <strong>{accuracy(group.statistics.accuracy)}</strong> · Tu resultado: <strong>{accuracy(group.statistics.myAccuracy)}</strong></p>
        <p>{group.statistics.correct} correctas de {group.statistics.answered} primeras respuestas en la materia. Incluye práctica anterior al ingreso al grupo; no representa un puntaje PAES.</p>
        <div className="social-table"><table><thead><tr><th>Miembro</th><th>Rol</th><th>Respuestas</th><th>Correctas</th></tr></thead><tbody>{group.members.map(member=><tr key={member.uid}><td>{member.name}</td><td>{member.role==='owner'?'Líder':'Miembro'}</td><td>{member.answered}</td><td>{accuracy(member.accuracy)}</td></tr>)}</tbody></table></div>
      </section>
      <h3>Preguntas compartidas y conversación</h3>
      <SocialFeed key={id} groupId={id} questionId={questionId} />
    </>}
  </div>;
}

export default function Groups() {
  const { t } = useTheme();
  const [params,setParams] = useSearchParams();
  const selected = params.get('groupId');
  const questionId = params.get('questionId');
  const requestedTest = params.get('testId');
  const [groups,setGroups] = useState(null);
  const [limit,setLimit] = useState(null);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [panel,setPanel] = useState('');
  const [name,setName] = useState('');
  const [test,setTest] = useState(SUBJECTS.some(([id])=>id===requestedTest)?requestedTest:'m1');
  const [code,setCode] = useState('');
  const [joining,setJoining] = useState(false);
  const guard = useRef(false);
  const create = useSocialMutation('/groups','create-group');
  const alive = useRef(false);
  const load = useCallback(async () => {
    try {
      const response = await apiFetch('/groups');
      if (!alive.current) return;
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
    if(id)next.set('groupId',id);else next.delete('groupId');
    setParams(next);
  };
  const createGroup = async event => {
    event.preventDefault();
    const response = await create.run({name,subjectTestId:test});
    if(!response)return;
    setName('');setPanel('');setMessage('Grupo creado. Comparte el código completo para invitar miembros.');
    await load();open(response.data.id);
  };
  const join = async event => {
    event.preventDefault();
    if(guard.current)return;
    guard.current=true;setJoining(true);setMessage('');
    try {
      const response=await apiFetch('/groups/join',{method:'POST',body:JSON.stringify({groupId:code.trim()})});
      setCode('');setPanel('');setMessage(response.data.alreadyMember?'Ya perteneces a este grupo.':'Te uniste al grupo.');
      await load();open(response.data.id);
    } catch(cause){setMessage(cause.message);}
    finally{guard.current=false;setJoining(false);}
  };
  if(selected)return <div className="social-page"><h1>{t.groups.title}</h1><GroupDetails key={selected} id={selected} questionId={questionId} onBack={()=>open(null)} onLeft={()=>{open(null);setMessage('Saliste del grupo.');load();}} /></div>;
  return <div className="social-page">
    <h1>{t.groups.title}</h1><p>{t.groups.subtitle}</p>
    {questionId && <p>Elige un grupo de la materia para compartir la pregunta de práctica con una duda o aporte.</p>}
    {limit!==null && <p>Grupos: {groups?.length ?? 0} · {limit===0?'Tu plan no limita la cantidad de grupos.':`Límite de tu plan: ${limit}.`}</p>}
    <div className="social-actions"><button disabled={create.busy || joining} onClick={()=>setPanel('create')}>Crear grupo</button><button disabled={create.busy || joining} onClick={()=>setPanel('join')}>Unirse con código</button><button disabled={create.busy || joining} onClick={load}>Actualizar grupos</button></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}{create.error && <p role="alert">{create.error}</p>}
    {(panel==='create' || create.pending) && <form onSubmit={createGroup}><h2>Crear grupo de estudio</h2>
      <label htmlFor="group-name">Nombre del grupo</label><input id="group-name" required maxLength={100} value={create.pending?.name ?? name} disabled={create.busy || !!create.pending} onChange={event=>setName(event.target.value)} />
      <label htmlFor="group-test">Materia principal</label><select id="group-test" value={create.pending?.subjectTestId ?? test} disabled={create.busy || !!create.pending} onChange={event=>setTest(event.target.value)}>{SUBJECTS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
      <div className="social-actions"><button disabled={create.busy || (!create.pending && !name.trim())}>{create.pending?'Reintentar creación':'Crear e invitar'}</button>{!create.pending && <button type="button" onClick={()=>setPanel('')}>Cancelar</button>}</div>
    </form>}
    {panel==='join' && !create.pending && <form onSubmit={join}><h2>Unirse a un grupo</h2><label htmlFor="group-code">Código completo del grupo</label><input id="group-code" required maxLength={128} value={code} disabled={joining} onChange={event=>setCode(event.target.value)} /><div className="social-actions"><button disabled={joining || !code.trim()}>Unirse al grupo</button><button type="button" disabled={joining} onClick={()=>setPanel('')}>Cancelar</button></div></form>}
    {!groups && !error && <p>Cargando grupos...</p>}
    {groups?.length===0 && <p>Aún no perteneces a ningún grupo. Crea uno o únete con una invitación.</p>}
    <div className="social-groups">{groups?.map(group=><article key={group.id}><h2>{group.name}</h2><p>{SUBJECTS.find(([id])=>id===group.subjectTestId)?.[1]} · {group.memberCount} miembros</p><p>{group.role==='owner'?'Eres líder de este grupo.':'Eres miembro de este grupo.'}</p><button onClick={()=>open(group.id)}>Abrir {group.name}</button></article>)}</div>
  </div>;
}
