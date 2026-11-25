import PasswordField from '../components/PasswordField';
import {useTheme} from '../context/useTheme';
import {uiText} from '../i18n/uiText';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function Register() {
  const {lang}=useTheme();
  const localize = value => uiText(lang,value);

  const [consent,setConsent]=useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if(!consent){setError(localize("Debes aceptar el tratamiento de tus datos para continuar."));return;}
    setError(null);
    if (password !== confirmation) { setError(localize("Las contraseñas no coinciden.")); return; }
    setLoading(true);

    try {
      await registerUser(name, email, password, consent);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || localize("Error al crear la cuenta"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'grid',
      placeItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel)',
        width: '100%',
        maxWidth: '440px',
        borderRadius: '20px',
        padding: '36px',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <svg width="32" height="32" viewBox="0 0 30 30" fill="none">
            <polygon points="3,27 9,6 13,6 8,27" fill="var(--brand)" />
            <polygon points="27,27 21,6 17,6 22,27" fill="var(--brand)" />
            <rect x="7" y="14" width="16" height="4" rx="1" fill="var(--brand)" />
            <rect x="12" y="14" width="6" height="10" rx="1" fill="var(--cta)" />
            <polygon points="15,5 12,10 18,10" fill="var(--cta)" />
          </svg>
          <span style={{
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: '22px',
            color: 'var(--ink)',
            letterSpacing: '-0.5px'
          }}>
            Aprueba
          </span>
        </div>

        <h1 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}> {localize("Crea tu cuenta de estudiante")} </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px', marginBottom: '20px' }}> {localize("Prepárate para la PAES con cuota diaria, medallas y grupos de estudio.")} </p>

        {error && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239,68,68,0.1)',
            color: 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label htmlFor="register-name" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}> {localize("Nombre y Apellido")} </label>
            <input id="register-name"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              placeholder={localize("Ej: Sofía Morales")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--soft)',
                color: 'var(--ink)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label htmlFor="register-email" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}> {localize("Correo electrónico")} </label>
            <input id="register-email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="tu.correo@ejemplo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--soft)',
                color: 'var(--ink)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label htmlFor="register-password" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}> {localize("Contraseña")} </label>
            <PasswordField id="register-password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder={localize("Mínimo 8 caracteres")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--soft)',
                color: 'var(--ink)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label htmlFor="register-confirmation" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}> {localize("Repite tu contraseña")} </label>
            <PasswordField id="register-confirmation" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid var(--line)', backgroundColor: 'var(--soft)', color: 'var(--ink)', fontSize: '13px' }} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              backgroundColor: 'var(--cta)',
              color: 'var(--cta-ink)',
              border: 'none',
              borderRadius: '10px',
              padding: '13px',
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? localize("Creando cuenta...") : localize("Crear Cuenta Estudiante")}
          </button>
        <label style={{display:'block',marginTop:16}}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> {localize("Acepto los términos y el tratamiento de mis datos para mi cuenta y práctica en Aprueba. Puedo eliminar mi cuenta desde Ajustes.")} </label></form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}> {localize("¿Ya tienes cuenta?")} {' '}
          <Link to="/login" style={{ color: 'var(--gold-ink)', fontWeight: 700, textDecoration: 'none' }}> {localize("Inicia sesión aquí")} </Link>
        </div>
      </div>
    </div>
  );
}
