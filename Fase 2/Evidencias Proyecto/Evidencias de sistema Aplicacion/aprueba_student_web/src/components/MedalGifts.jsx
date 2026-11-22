import ApruebaIcon from './ApruebaIcon';
import {useEffect,useState} from 'react';
import {apiFetch} from '../api/client';
import {useTheme} from '../context/useTheme';
export default function MedalGifts({onSent}) {
 const {lang}=useTheme(),en=lang==='en';
 const [data,setData]=useState(null),[amount,setAmount]=useState(1),[recipient,setRecipient]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [pending,setPending]=useState(null);
 useEffect(()=>{const controller=new AbortController();apiFetch('/medals/gifts',{signal:controller.signal}).then(res=>setData(res.data)).catch(err=>{if(!controller.signal.aborted)setMessage(err.message);});return()=>controller.abort();},[]);
 const send=async event=>{
  event.preventDefault();if(busy)return;
  const operation=pending || {requestId:crypto.randomUUID(),recipients:[{userId:recipient,amount:Number(amount)}]};setPending(operation);setBusy(true);
  try {await apiFetch('/medals/gifts',{method:'POST',body:JSON.stringify(operation)});setPending(null);setMessage(en?'Medals gifted.':'Medallas regaladas.');const res=await apiFetch('/medals/gifts');setData(res.data);onSent();}
  catch(err){setMessage(err.message);if(err.status>=400 && err.status<500)setPending(null);}finally{setBusy(false);}
 };
 return <section className="wallet-module wallet-gift"><h2><ApruebaIcon name="gift" />{en?'Gift medals':'Regalar medallas'}</h2><p>{en?'Gift up to 10 bronze medals a day to members of your groups.':'Regala hasta 10 medallas de bronce al día a integrantes de tus grupos.'}</p>
 {message && <p role="status">{message}</p>}{data && <><p className="wallet-quota"><strong>{data.daily.used}/10</strong> {en?'sent today':'enviadas hoy'} · {en?'Bronze available':'Bronce disponible'}: {data.bronzeAvailable}<progress max={10} value={data.daily.used} aria-label={en?'Daily gifts sent':'Regalos enviados hoy'} /></p>
 {data.friends.length ? <form onSubmit={send}><label>{en?'Recipient':'Destinatario'}<select required disabled={busy || !!pending} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">{en?'Choose a member':'Elige un integrante'}</option>{data.friends.map(friend=><option key={friend.userId} value={friend.userId}>{friend.name}</option>)}</select></label><label>{en?'Bronze medals':'Medallas de bronce'}<input type="number" min="1" max={Math.min(10-data.daily.used,data.bronzeAvailable)} value={amount} disabled={busy || !!pending} onChange={e=>setAmount(e.target.value)} /></label><button disabled={busy || !recipient || data.daily.used>=10 || data.bronzeAvailable<1}>{en?'Confirm gift':'Confirmar regalo'}</button></form>:<p>{en?'Join a study group to gift medals.':'Únete a un grupo para regalar medallas.'}</p>}</>}
 </section>;
}
