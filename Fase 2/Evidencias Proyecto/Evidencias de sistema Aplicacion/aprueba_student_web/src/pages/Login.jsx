import {useTheme} from '../context/useTheme';
import {uiText} from '../i18n/uiText';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function Login() {
  const {lang}=useTheme();
  const localize = value => uiText(lang,value);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(email, password);
      const invitation=sessionStorage.getItem('aprueba:group-invitation');
      navigate(data.user.onboardingCompleted === true ? (invitation ? '/grupos?invite='+encodeURIComponent(invitation) : '/') : '/onboarding', { replace: true });
    } catch (err) {
      setError(err.message || localize("Credenciales inválidas"));
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

        <h1 style={{ fontFamily: 'Montserrat', fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}> {localize("Ingresa a tu cuenta")} </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px', marginBottom: '20px' }}> {localize("Continúa con tu racha de preparación PAES 2026.")} </p>

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
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}> {localize("Correo electrónico")} </label>
            <input id="login-email"
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
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}> {localize("Contraseña")} </label>
            <input id="login-password"
              type="password"
              required
              maxLength={128}
              autoComplete="current-password"
              placeholder={localize("Tu contraseña")}
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

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              backgroundColor: 'var(--brand)',
              color: 'var(--on-brand, #fff)',
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
            {loading ? localize("Iniciando sesión...") : localize("Iniciar Sesión")}
          </button>
        </form>

        <p style={{ marginTop: '16px', textAlign: 'center' }}><Link to="/recuperar-contrasena" style={{ color: 'var(--brand)', fontWeight: 700 }}> {localize("¿Olvidaste tu contraseña?")} </Link></p>
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}> {localize("¿No tienes cuenta?")} {' '}
          <Link to="/register" style={{ color: 'var(--cta)', fontWeight: 700, textDecoration: 'none' }}> {localize("Regístrate aquí")} </Link>
        </div>
      </div>
    </div>
  );
}
