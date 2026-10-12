import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function PrivateRoute({ children, onboarding = false }) {
  const { user, loading, sessionError, logout } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'Montserrat',
        fontWeight: 600,
        color: 'var(--gris-medio)',
        backgroundColor: 'var(--fondo)'
      }}>
        Verificando sesión...
      </div>
    );
  }

  if (!user && sessionError && localStorage.getItem('token')) {
    return <div className="auth-screen"><div className="auth-card"><p role="alert">{sessionError}</p><button className="auth-button" onClick={() => window.location.reload()}>Reintentar</button><button className="auth-button secondary" onClick={logout}>Volver al inicio de sesión</button></div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!onboarding && user.onboardingCompleted !== true) return <Navigate to="/onboarding" replace />;
  if (onboarding && user.onboardingCompleted === true) return <Navigate to="/" replace />;

  return children;
}
