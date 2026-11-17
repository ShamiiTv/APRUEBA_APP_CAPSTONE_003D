import {useTheme} from '../context/useTheme';
import {uiText} from '../i18n/uiText';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import '../components/Social.css';

export default function GroupInvitation() {
  const {lang}=useTheme();
  const localize = value => uiText(lang,value);

  const [params]=useSearchParams();
  const {user,loading}=useAuth();
  const code=params.get('codigo') || '';
  if(!/^[A-Za-z0-9_-]+(?::[a-f0-9]{48})?$/.test(code) || code.length>200) return <main className="social-page"><h1> {localize("Invitación inválida")} </h1><p> {localize("Solicita el enlace completo a un integrante del grupo.")} </p></main>;
  if(user?.emailVerified && user?.onboardingCompleted) return <Navigate to={'/grupos?invite='+encodeURIComponent(code)} replace />;
  const save=()=>sessionStorage.setItem('aprueba:group-invitation',code);
  return <main className="social-page"><h1> {localize("Te invitaron a un grupo de Aprueba")} </h1><p> {localize("Inicia sesión y confirma tu correo para unirte. Conservaremos la invitación en este navegador mientras completas el acceso.")} </p><p> {localize("También puedes copiar el código y pegarlo en Grupos → Unirme con código en la app Android.")} </p><code style={{overflowWrap:'anywhere'}}>{code}</code><p>{loading?localize("Comprobando sesión…"):null}</p><Link onClick={save} to={user?'/verificar-correo':'/login'}> {localize("Continuar con mi cuenta")} </Link> · <Link onClick={save} to="/register"> {localize("Crear una cuenta")} </Link></main>;
}
