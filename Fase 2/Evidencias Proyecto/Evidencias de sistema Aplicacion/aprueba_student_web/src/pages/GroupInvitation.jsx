import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import '../components/Social.css';

export default function GroupInvitation() {
  const [params]=useSearchParams();
  const {user,loading}=useAuth();
  const code=params.get('codigo') || '';
  if(!/^[A-Za-z0-9_-]+(?::[a-f0-9]{48})?$/.test(code) || code.length>200) return <main className="social-page"><h1>Invitación inválida</h1><p>Solicita el enlace completo a un integrante del grupo.</p></main>;
  if(user?.emailVerified && user?.onboardingCompleted) return <Navigate to={'/grupos?invite='+encodeURIComponent(code)} replace />;
  const save=()=>sessionStorage.setItem('aprueba:group-invitation',code);
  return <main className="social-page"><h1>Te invitaron a un grupo de Aprueba</h1><p>Inicia sesión y confirma tu correo para unirte. Conservaremos la invitación en este navegador mientras completas el acceso.</p><p>También puedes copiar el código y pegarlo en Grupos → Unirme con código en la app Android.</p><code style={{overflowWrap:'anywhere'}}>{code}</code><p>{loading?'Comprobando sesión…':null}</p><Link onClick={save} to={user?'/verificar-correo':'/login'}>Continuar con mi cuenta</Link> · <Link onClick={save} to="/register">Crear una cuenta</Link></main>;
}
