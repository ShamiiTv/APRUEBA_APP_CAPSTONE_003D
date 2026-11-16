import {useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '../auth/useAuth';
import {useTheme} from '../context/useTheme';
import {useApiResource} from '../hooks/useApiResource';
import './Parity.css';
export default function NotificationBell(){
 const {reward,dismissReward}=useAuth(),{lang}=useTheme(),en=lang==='en';
 const {data,refresh}=useApiResource('/me/notifications');const location=useLocation();
 useEffect(()=>{refresh();},[location.pathname,refresh]);
 useEffect(()=>{window.addEventListener('aprueba:notifications-changed',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('aprueba:notifications-changed',refresh);window.removeEventListener('focus',refresh);};},[refresh]);
 useEffect(()=>{if(!reward)return;const id=setTimeout(dismissReward,6000);return()=>clearTimeout(id);},[reward,dismissReward]);
 return <><Link to="/notificaciones" aria-label={`${en?'Notifications':'Notificaciones'}: ${data?.unread??0}`}>🔔 {data?.unread>0 && <strong>{data.unread}</strong>}</Link>{reward && <aside className="parity-toast" role="status"><strong>+{reward.amount} {en?'Bronze medal':'Medalla de Bronce'}</strong><p>{reward.welcome?(en?'Welcome to Aprueba':'Bienvenida a Aprueba'):(en?'Daily login':'Inicio de sesión diario')}{reward.streak>1?` · ${en?'Streak':'Racha'}: ${reward.streak}`:''}</p><Link to="/medallas" onClick={dismissReward}>{en?'View medals':'Ver medallas'}</Link> <button onClick={dismissReward} aria-label={en?'Dismiss':'Cerrar'}>×</button></aside>}</>;
}
