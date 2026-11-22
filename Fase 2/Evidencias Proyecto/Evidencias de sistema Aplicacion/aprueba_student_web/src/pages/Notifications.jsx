import {uiText} from '../i18n/uiText';
import {useState} from 'react';
import {useApiResource} from '../hooks/useApiResource';
import {apiFetch} from '../api/client';
import {useTheme} from '../context/useTheme';
import ApruebaIcon from '../components/ApruebaIcon';
import ContentSkeleton from '../components/ContentSkeleton';
import '../components/Parity.css';
export default function Notifications(){
 const {lang}=useTheme(),en=lang==='en';const {data,error,loading,refresh}=useApiResource('/me/notifications');
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function read(items){if(busy)return;setBusy(true);setFailure('');try{for(const n of items.filter(n=>!n.read))await apiFetch(`/me/notifications/${n.id}/read`,{method:'PATCH',body:'{}'});refresh();window.dispatchEvent(new Event('aprueba:notifications-changed'));}catch(e){setFailure(e.message);}finally{setBusy(false);}}
 return <section className="parity-page"><h1 className="inbox-heading"><ApruebaIcon name="bell" size={30} />{en?'Notifications':'Notificaciones'}</h1><div className="parity-actions"><button onClick={refresh}>{en?'Refresh':'Actualizar'}</button><button disabled={busy || !data?.unread} onClick={()=>read(data.items)}>{en?'Mark all read':'Marcar todas como leídas'}</button></div>{(error||failure)&&<p role="alert">{error||failure}</p>}{loading&&<ContentSkeleton kind="notifications"/>}{data?.items.length===0&&<p>{en?'No notifications yet.':'No tienes notificaciones.'}</p>}{data?.items.map(n=><article className={`parity-panel ${n.read?'':'parity-unread'}`} key={n.id}><div className="inbox-row"><ApruebaIcon name="bell" /><div><h2>{uiText(lang,n.title)}</h2><p>{uiText(lang,n.body)}</p>{n.createdAt&&<time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(en?'en-US':'es-CL')}</time>}<div className="parity-actions">{n.read ? <small>{en?'Read':'Leída'}</small> : <button disabled={busy} onClick={()=>read([n])}>{n.read?(en?'Read':'Leída'):(en?'Mark read':'Marcar como leída')}</button>}</div></div></div></article>)}</section>;
}
