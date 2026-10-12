import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch, clearSession } from '../api/client';

export default function PasswordRecovery({ reset = false }) {
  const [params] = useSearchParams();
  const code = params.get('oobCode');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const invalidLink = reset && !code;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (reset && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const res = await apiFetch(reset ? '/auth/reset-password' : '/auth/forgot-password', {
        method: 'POST', body: JSON.stringify(reset ? { oobCode: code, password } : { email }),
      });
      if (reset) { clearSession(); window.dispatchEvent(new Event('aprueba:session-ended')); }
      setMessage(res.data.message);
      setPassword('');
      setConfirmation('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <div className="auth-screen"><section className="auth-card" aria-labelledby="recovery-title">
    <div className="auth-brand">Aprueba</div>
    <h1 id="recovery-title">{reset ? 'Crea tu nueva contraseña' : 'Recupera tu acceso'}</h1>
    <p className="auth-description">{reset ? 'Elige una contraseña de entre 8 y 128 caracteres.' : 'Te enviaremos un enlace para establecer una nueva contraseña.'}</p>
    {invalidLink && <p role="alert" className="auth-error">Este enlace no es válido. Solicita uno nuevo.</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {message ? <p role="status" className="auth-success">{message}</p> : !invalidLink && <form onSubmit={submit} className="auth-form">
      {reset ? <>
        <label htmlFor="new-password">Nueva contraseña</label>
        <input id="new-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        <label htmlFor="confirm-password">Repite tu contraseña</label>
        <input id="confirm-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </> : <>
        <label htmlFor="recovery-email">Correo electrónico</label>
        <input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      </>}
      <button className="auth-button" disabled={busy}>{busy ? 'Procesando…' : reset ? 'Actualizar contraseña' : 'Enviar enlace'}</button>
    </form>}
    {reset && !message && <p><Link to="/recuperar-contrasena">Solicitar otro enlace</Link></p>}
    <Link to="/login" className="auth-back">Volver al inicio de sesión</Link>
  </section></div>;
}
