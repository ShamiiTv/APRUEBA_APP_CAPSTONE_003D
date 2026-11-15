import ContentSkeleton from './ContentSkeleton';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function PrivateRoute({ children, onboarding = false, verification = false }) {
  const { user, loading, sessionError, logout } = useAuth();

  if (loading) {
    return <main style={{maxWidth:960,margin:'24px auto',padding:20}}><ContentSkeleton kind="home" /></main>;
  }

  if (!user && sessionError && localStorage.getItem('token')) {
    return <div className="auth-screen"><div className="auth-card"><p role="alert">{sessionError}</p><button className="auth-button" onClick={() => window.location.reload()}>Reintentar</button><button className="auth-button secondary" onClick={logout}>Volver al inicio de sesión</button></div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.emailVerified !== true) return verification ? children : <Navigate to="/verificar-correo" replace />;
  if (verification) {
    const invitation=sessionStorage.getItem('aprueba:group-invitation');
    return <Navigate to={user.onboardingCompleted ? (invitation ? '/grupos?invite='+encodeURIComponent(invitation) : '/') : '/onboarding'} replace />;
  }
  if (!onboarding && user.onboardingCompleted !== true) return <Navigate to="/onboarding" replace />;
  if (onboarding && user.onboardingCompleted === true) return <Navigate to="/" replace />;

  return children;
}
