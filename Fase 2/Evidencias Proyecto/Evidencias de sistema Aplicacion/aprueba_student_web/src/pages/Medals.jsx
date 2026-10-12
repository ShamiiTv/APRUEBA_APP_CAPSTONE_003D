import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import MedalIcon from '../components/MedalIcon';
import './Medals.css';
const TIERS = [['bronze','Bronce'],['silver','Plata'],['gold','Oro'],['diamond','Diamante'],['platinum','Platino']];
const label = tier => TIERS.find(([key])=>key===tier)?.[1] || tier;
export default function Medals() {
  const { user, updateUserState }=useAuth();
  const { t }=useTheme();
  const [summary,setSummary]=useState(null);
  const [benefits,setBenefits]=useState(null);
  const [error,setError]=useState('');
  const [benefitError,setBenefitError]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [confirmation,setConfirmation]=useState(null);
  const guard=useRef(false);
  const [pending,setPending]=useState(()=>{try {return JSON.parse(sessionStorage.getItem('medals-pending:'+user?.uid) || 'null');} catch {return null;}});
  const generation=useRef(0);
  const uid=user?.uid;
  const pendingKey=`medals-pending:${uid}`;
  const load=useCallback(async ()=>{
    const current=++generation.current;
    const results=await Promise.allSettled([apiFetch('/medals'),apiFetch('/medals/benefits')]);
    if (current!==generation.current) return;
    if (results[0].status==='fulfilled') {
      setSummary(results[0].value.data); setError('');
      updateUserState({uid,medals:results[0].value.data.medals});
    } else setError('No se pudieron cargar tus saldos. Vuelve a intentar.');
    if (results[1].status==='fulfilled') {setBenefits(results[1].value.data);setBenefitError('');}
    else setBenefitError('No se pudo cargar el catálogo de beneficios.');
  },[uid,updateUserState]);
  useEffect(()=>{let active=true; const version=generation; queueMicrotask(()=>{if(active)load();}); return ()=>{active=false;version.current++;};},[load]);
  const submit=async (kind,key)=>{
    if (guard.current) return;
    guard.current=true; setBusy(true); setMessage('');
    const current=generation.current;
    const request=pending || {kind,key,requestId:crypto.randomUUID()};
    setPending(request);
    try {
      sessionStorage.setItem(pendingKey,JSON.stringify(request));
      const response=await apiFetch(request.kind==='exchange' ? '/medals/exchange' : '/medals/benefits/redeem',{method:'POST',body:JSON.stringify({requestId:request.requestId,...(request.kind==='exchange' ? {fromTier:request.key} : {benefitId:request.key})})});
      if (current!==generation.current) return;
      setPending(null); sessionStorage.removeItem(pendingKey); setConfirmation(null);
      setSummary(prev=>({...prev,medals:response.data.medals}));
      updateUserState({uid,medals:response.data.medals});
      setMessage(request.kind==='exchange' ? `Canje registrado: 1 medalla de ${label(response.data.upgradedTier)}.` : 'Solicitud registrada. La entrega del beneficio está pendiente de coordinación con el patrocinador.');
      await load();
    } catch(e) {
      if (current===generation.current) {
        if ([400,404,409].includes(e.status)) {
          setPending(null); sessionStorage.removeItem(pendingKey); setConfirmation(null);
          setMessage(e.message); await load();
        } else setMessage(`${e.message} Puedes reintentar la misma solicitud de forma segura.`);
      }
    }
    finally {guard.current=false;setBusy(false);}
  };
  return <div className="medals-page">
    <h1>{t.medals.title}</h1>
    <p>Obtienes una medalla de bronce por cada primera respuesta correcta. Convierte 5 medallas en 1 del siguiente nivel.</p>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy} onClick={load}>Actualizar saldos y catálogo</button>
    {message && <p role="status">{message}</p>}
    {!summary && !error && <p>Cargando saldos...</p>}
    {summary && <>
      <div className="medals-balances">{TIERS.map(([tier,name])=><div key={tier} className={`medal-card medal-card--${tier}`}><MedalIcon tier={tier} /><span className="medal-name">{name}</span><strong>{summary.medals[tier]}</strong><span className="medal-caption">{summary.medals[tier]===1?'medalla':'medallas'}</span></div>)}</div>
      <section><h2>Convertir medallas</h2>
        {TIERS.slice(0,-1).map(([tier,name],index)=><div className="medals-row" key={tier}><span className="medals-conversion"><MedalIcon tier={tier} />5 {name}<span aria-hidden="true">→</span><MedalIcon tier={TIERS[index+1][0]} />1 {TIERS[index+1][1]}</span><button disabled={busy || !!error || !!pending || summary.medals[tier]<5} onClick={()=>submit('exchange',tier)}>Canjear {name}</button></div>)}
      </section>
      {pending && !busy && <button onClick={()=>submit(pending.kind,pending.key)}>Reintentar solicitud pendiente</button>}
    </>}
    <section><h2>Beneficios de patrocinadores</h2><p>El canje descuenta platino y reserva una unidad. La entrega queda pendiente; aquí no se emiten cupones automáticamente.</p>
      {benefitError ? <p role="alert">{benefitError}</p> : !benefits ? <p>Cargando beneficios...</p> : benefits.length===0 ? <p>No hay beneficios activos en este momento.</p> : benefits.map(b=><article key={b.id}>
        <h3>{b.name}</h3><p>{b.sponsorName}</p><p>{b.description}</p>
        <p>{b.costPlatinum===null ? 'Costo no definido' : `${b.costPlatinum} medallas de Platino`} · {b.stock===null ? 'Disponibilidad no definida' : `${b.stock} disponibles`}</p>
        <button disabled={busy || !!pending || !!error || !summary || !b.canRedeem || summary.medals.platinum<b.costPlatinum} onClick={()=>setConfirmation(b)}>Solicitar {b.name}</button>
      </article>)}
      {confirmation && <div role="group" aria-label="Confirmar canje de beneficio"><p>¿Solicitar {confirmation.name} por {confirmation.costPlatinum} medallas de Platino? La entrega estará pendiente.</p><button disabled={busy} onClick={()=>submit('benefit',confirmation.id)}>Confirmar solicitud</button><button disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button></div>}
    </section>
    {summary && <>
      <section><h2>Mis solicitudes de beneficios</h2><p>Últimas 50 solicitudes.</p>{summary.redemptions?.length ? summary.redemptions.map(r=><article key={r.id}><strong>{r.name}</strong><p>Referencia: {r.id}</p><p>{r.status==='pending' ? 'Entrega pendiente' : r.status} · {r.costPlatinum} Platino</p></article>) : <p>Aún no has solicitado beneficios.</p>}</section>
      <section><h2>Historial de medallas</h2><p>Últimos 50 movimientos.</p>{summary.history.length ? <ul>{summary.history.map(h=><li key={h.id}>{h.amount>0 ? '+' : ''}{h.amount} {label(h.tier)} · {h.reason}{h.createdAt && <time dateTime={h.createdAt}> · {new Date(h.createdAt).toLocaleString('es-CL',{timeZone:'America/Santiago'})}</time>}</li>)}</ul> : <p>Aún no tienes movimientos.</p>}</section>
    </>}
  </div>;
}
