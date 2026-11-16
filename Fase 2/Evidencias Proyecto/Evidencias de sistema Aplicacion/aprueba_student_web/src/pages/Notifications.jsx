import {useState} from 'react';
import {useApiResource} from '../hooks/useApiResource';
import {apiFetch} from '../api/client';
import {useTheme} from '../context/useTheme';
import ContentSkeleton from '../components/ContentSkeleton';
import '../components/Parity.css';
export default function Notifications(){
 const {lang}=useTheme(),en=lang==='en';const {data,error,loading,refresh}=useApiResource('/me/notifications');
 const [busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function read(items){if(busy)return;setBusy(true);setFailure('');try{for(const n of items.filter(n=>!n.read))await apiFetch(`/me/notifications/${n.id}/read`,{method:'PATCH',body:'{}'});refresh();window.dispatchEvent(new Event('aprueba:notifications-changed'));}catch(e){setFailure(e.message);}finally{setBusy(false);}}
 return <section className="parity-page"><h1>{en?'Notifications':'Notificaciones'}</h1><div className="parity-actions"><button onClick={refresh}>{en?'Refresh':'Actualizar'}</button><button disabled={busy || !data?.unread} onClick={()=>read(data.items)}>{en?'Mark all read':'Marcar todas como leídas'}</button></div>{(error||failure)&&<p role="alert">{error||failure}</p>}{loading&&<ContentSkeleton kind="cards"/>}{data?.items.length===0&&<p>{en?'No notifications yet.':'No tienes notificaciones.'}</p>}{data?.items.map(n=><article className={`parity-panel ${n.read?'':'parity-unread'}`} key={n.id}><h2>{n.title}</h2><p>{n.body}</p>{n.createdAt&&<time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(en?'en-US':'es-CL')}</time>}<div className="parity-actions"><button disabled={busy||n.read} onClick={()=>read([n])}>{n.read?(en?'Read':'Leída'):(en?'Mark read':'Marcar como leída')}</button></div></article>)}</section>;
}
