import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Vistas Públicas
import Login from './pages/Login';
import Register from './pages/Register';

// Vistas Privadas
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Medals from './pages/Medals';
import Groups from './pages/Groups';
import Tutors from './pages/Tutors';
import Community from './pages/Community';
import Plan from './pages/Plan';
import Settings from './pages/Settings';

// Protege /login y /register: si ya hay sesión activa, redirige
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const hasToken = Boolean(localStorage.getItem('token'));

  // Si aún está resolviendo la petición con el servidor pero hay token
  if (loading && hasToken) {
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

  // Si ya tenemos el objeto de usuario o hay un token válido
  if (user) {
    if (user.onboardingCompleted === false) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />

          {/* Onboarding inicial */}
          <Route
            path="/onboarding"
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            }
          />

          {/* Rutas Protegidas del Estudiante */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="practicar" element={<Practice />} />
            <Route path="medallas" element={<Medals />} />
            <Route path="grupos" element={<Groups />} />
            <Route path="tutores" element={<Tutors />} />
            <Route path="comunidad" element={<Community />} />
            <Route path="plan" element={<Plan />} />
            <Route path="ajustes" element={<Settings />} />
          </Route>

          {/* Redirección comodín */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}