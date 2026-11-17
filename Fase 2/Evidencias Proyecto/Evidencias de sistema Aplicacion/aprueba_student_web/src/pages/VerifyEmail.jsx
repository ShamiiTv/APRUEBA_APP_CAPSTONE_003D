import {useTheme} from '../context/useTheme';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { apiFetch } from '../api/client';

export default function VerifyEmail() {
  const { user, updateUserState, logout } = useAuth();
  const {lang}=useTheme();
  const en = lang === 'en';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [sentAt, setSentAt] = useState(0);
  async function run(send) {
    if (busy) return;
    if (send && Date.now() - sentAt < 60000) {
      setMessage(en ? 'Wait one minute before requesting another email.' : 'Espera un minuto antes de solicitar otro correo.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      if (send) {
        await apiFetch('/auth/verify-email', { method:'POST', body:JSON.stringify({ currentPassword:password }) });
        setSentAt(Date.now()); setPassword('');
        setMessage(en ? 'Email sent. Check your inbox and spam folder.' : 'Correo enviado. Revisa tu bandeja y la carpeta de spam.');
      } else {
        const res = await apiFetch('/auth/me');
        updateUserState(res.data);
        if (!res.data.emailVerified) setMessage(en ? 'Your email is not verified yet. Open the link and try again.' : 'Tu correo aún no está verificado. Abre el enlace y vuelve a comprobar.');
      }
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-screen"><section className="auth-card verification-card" aria-labelledby="verify-title" aria-busy={busy}>
    <div className="verification-brand"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30" fill="none"><polygon points="3,27 9,6 13,6 8,27" fill="var(--brand)"/><polygon points="27,27 21,6 17,6 22,27" fill="var(--brand)"/><rect x="7" y="14" width="16" height="4" rx="1" fill="var(--brand)"/><rect x="12" y="14" width="6" height="10" rx="1" fill="var(--cta)"/><polygon points="15,5 12,10 18,10" fill="var(--cta)"/></svg> Aprueba</div>
    <div className="verification-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg></div>
    <h1 id="verify-title">{en ? 'Verify your email' : 'Confirma tu correo'}</h1>
    <p className="auth-description">{en ? 'One last step to activate your account and start practicing.' : 'Un último paso para activar tu cuenta y empezar a practicar.'}</p>
    <div className="verification-address"><span>{en ? 'Verification email sent to' : 'Enviamos un enlace de verificación a'}</span><strong>{user?.email}</strong></div>
    <p className="verification-help">{en ? 'Open the link in your email, then return here to continue.' : 'Abre el enlace del correo y después vuelve aquí para continuar.'}</p>
    <button className="auth-button" disabled={busy} onClick={()=>run(false)}>{busy ? (en ? 'Please wait…' : 'Un momento…') : (en ? 'I verified my email · Continue' : 'Ya confirmé mi correo · Continuar')}</button>
    <form className="auth-form verification-resend" onSubmit={e=>{e.preventDefault();run(true);}}>
      <h2>{en ? 'Did not receive it?' : '¿No recibiste el correo?'}</h2>
      <p className="verification-help">{en ? 'Check your spam folder. You can also request another link using your current password.' : 'Revisa la carpeta de spam. También puedes solicitar otro enlace con tu contraseña actual.'}</p>
      <label htmlFor="verification-password">{en ? 'Current password' : 'Contraseña actual'}</label>
      <input id="verification-password" type="password" autoComplete="current-password" placeholder={en ? 'Enter your password' : 'Ingresa tu contraseña'} required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="auth-button secondary" disabled={busy || !password}>{en ? 'Resend verification email' : 'Reenviar correo de verificación'}</button>
    </form>
    {message && <p className="verification-message" role="status">{message}</p>}
    <button className="verification-signout" disabled={busy} onClick={logout}>{en ? 'Use another account / Sign out' : 'Usar otra cuenta / Cerrar sesión'}</button>
  </section></main>;
}
