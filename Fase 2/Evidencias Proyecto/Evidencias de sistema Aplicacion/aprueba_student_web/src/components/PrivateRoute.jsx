import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}