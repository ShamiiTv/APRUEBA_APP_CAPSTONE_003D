import {uiText} from '../i18n/uiText';
import ContentSkeleton from '../components/ContentSkeleton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../context/useTheme';
import MedalIcon from '../components/MedalIcon';
import './Medals.css';
import MedalGifts from '../components/MedalGifts';
const BASE_TIERS = [['bronze','Bronce'],['silver','Plata'],['gold','Oro'],['diamond','Diamante'],['platinum','Platino']];
export default function Medals() {
  const { user, updateUserState }=useAuth();
  const { t,lang }=useTheme();const tr=(es,en)=>lang==='en'?en:es;
  const names={bronze:'Bronze',silver:'Silver',gold:'Gold',diamond:'Diamond',platinum:'Platinum'};
  const TIERS=BASE_TIERS.map(([tier,name])=>[tier,lang==='en'?names[tier]:name]);
  const label=tier=>TIERS.find(([key])=>key===tier)?.[1] || tier;
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
      setMessage(request.kind==='exchange' ? tr(`Canje registrado: 1 medalla de ${label(response.data.upgradedTier)}.`,`Exchange recorded: 1 ${label(response.data.upgradedTier)} medal.`) : tr('Solicitud registrada. La entrega del beneficio está pendiente de coordinación con el patrocinador.','Request recorded. Fulfillment is awaiting coordination with the sponsor.'));
      await load();
    } catch(e) {
      if (current===generation.current) {
        if ([400,404,409].includes(e.status)) {
          setPending(null); sessionStorage.removeItem(pendingKey); setConfirmation(null);
          setMessage(e.message); await load();
        } else setMessage(`${e.message} ${tr('Puedes reintentar la misma solicitud de forma segura.','You can safely retry the same request.')}`);
      }
    }
    finally {guard.current=false;setBusy(false);}
  };
  return <div className="medals-page">
    <h1>{t.medals.title}</h1>
    <p>{tr('Obtienes una medalla de bronce por cada primera respuesta correcta. Convierte 5 medallas en 1 del siguiente nivel.','Earn one bronze medal for each first correct answer. Exchange five medals for one of the next tier.')}</p>
    {error && <p role="alert">{uiText(lang,error)}</p>}
    <button disabled={busy} onClick={load}>{tr('Actualizar saldos y catálogo','Refresh balances and catalog')}</button>
    {message && <p role="status">{uiText(lang,message)}</p>}
    {!summary && !error && <ContentSkeleton kind="medals" />}
    {summary && <>
      <div className="medals-balances">{TIERS.map(([tier,name])=><div key={tier} className={`medal-card medal-card--${tier}`}><MedalIcon tier={tier} /><span className="medal-name">{name}</span><strong>{summary.medals[tier]}</strong><span className="medal-caption">{summary.medals[tier]===1?tr('medalla','medal'):tr('medallas','medals')}</span></div>)}</div>
      <section><h2>{tr('Convertir medallas','Exchange medals')}</h2>
        {TIERS.slice(0,-1).map(([tier,name],index)=><div className="medals-row" key={tier}><span className="medals-conversion"><MedalIcon tier={tier} />5 {name}<span aria-hidden="true">→</span><MedalIcon tier={TIERS[index+1][0]} />1 {TIERS[index+1][1]}</span><button disabled={busy || !!error || !!pending || summary.medals[tier]<5} onClick={()=>submit('exchange',tier)}>{tr('Canjear','Exchange')} {name}</button></div>)}
      </section>
      {pending && !busy && <button onClick={()=>submit(pending.kind,pending.key)}>{tr('Reintentar solicitud pendiente','Retry pending request')}</button>}
    </>}
    <MedalGifts onSent={load} />
    <section><h2>{tr('Beneficios de patrocinadores','Brand benefits')}</h2><p>{tr('Los beneficios se habilitan desde 5 medallas de Platino.','Benefits become available from five platinum medals.')}</p><p>{tr('El canje descuenta platino y reserva una unidad. La entrega queda pendiente; aquí no se emiten cupones automáticamente.','Redeeming deducts platinum and reserves one item. Fulfillment is pending; coupons are not issued automatically.')}</p>
      {benefitError ? <p role="alert">{uiText(lang,benefitError)}</p> : !benefits ? <ContentSkeleton kind="cards" /> : benefits.length===0 ? <p>{tr('No hay beneficios activos en este momento.','There are no active benefits right now.')}</p> : benefits.map(b=><article key={b.id}>
        <h3>{uiText(lang,b.name)}</h3><p>{b.sponsorName}</p><p>{uiText(lang,b.description)}</p>
        <p>{b.costPlatinum===null ? tr('Costo no definido','Cost not set') : `${b.costPlatinum} ${tr('medallas de Platino','platinum medals')}`} · {b.stock===null ? tr('Disponibilidad no definida','Availability not set') : `${b.stock} ${tr('disponibles','available')}`}</p>
        <button disabled={busy || !!pending || !!error || !summary || !b.canRedeem || summary.medals.platinum<b.costPlatinum} onClick={()=>setConfirmation(b)}>{tr('Solicitar','Request')} {uiText(lang,b.name)}</button>
      </article>)}
      {confirmation && <div role="group" aria-label={tr('Confirmar canje de beneficio','Confirm benefit redemption')}><p>{tr(`¿Solicitar ${uiText(lang,confirmation.name)} por ${confirmation.costPlatinum} medallas de Platino? La entrega estará pendiente.`,`Request ${uiText(lang,confirmation.name)} for ${confirmation.costPlatinum} platinum medals? Fulfillment will be pending.`)}</p><button disabled={busy} onClick={()=>submit('benefit',confirmation.id)}>{tr('Confirmar solicitud','Confirm request')}</button><button disabled={busy} onClick={()=>setConfirmation(null)}>{tr('Cancelar','Cancel')}</button></div>}
    </section>
    {summary && <>
      <section><h2>{tr('Mis solicitudes de beneficios','My benefit requests')}</h2><p>{tr('Últimas 50 solicitudes.','Latest 50 requests.')}</p>{summary.redemptions?.length ? summary.redemptions.map(r=><article key={r.id}><strong>{uiText(lang,r.name)}</strong><p>{tr('Referencia','Reference')}: {r.id}</p><p>{r.status==='pending' ? tr('Entrega pendiente','Fulfillment pending') : r.status} · {r.costPlatinum} {tr('Platino','Platinum')}</p></article>) : <p>{tr('Aún no has solicitado beneficios.','No benefit requests yet.')}</p>}</section>
      <section><h2>{tr('Historial de medallas','Medal history')}</h2><p>{tr('Últimos 50 movimientos.','Latest 50 transactions.')}</p>{summary.history.length ? <ul>{summary.history.map(h=><li key={h.id}>{h.amount>0 ? '+' : ''}{h.amount} {label(h.tier)} · {uiText(lang,h.reason)}{h.createdAt && <time dateTime={h.createdAt}> · {new Date(h.createdAt).toLocaleString(lang==='en'?'en-US':'es-CL',{timeZone:'America/Santiago'})}</time>}</li>)}</ul> : <p>{tr('Aún no tienes movimientos.','No transactions yet.')}</p>}</section>
    </>}
  </div>;
}
