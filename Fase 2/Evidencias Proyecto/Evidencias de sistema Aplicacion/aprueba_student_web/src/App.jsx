import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Vistas Públicas
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import GroupInvitation from './pages/GroupInvitation';
import PasswordRecovery from './pages/PasswordRecovery';

// Vistas Privadas
import Onboarding from './pages/Onboarding';

const Notifications = lazy(() => import('./pages/Notifications'));
const TutorAnalysis = lazy(() => import('./pages/TutorAnalysis'));
const Home = lazy(() => import('./pages/Home'));
const Practice = lazy(() => import('./pages/Practice'));
const Medals = lazy(() => import('./pages/Medals'));
const Groups = lazy(() => import('./pages/Groups'));
const Tutors = lazy(() => import('./pages/Tutors'));
const Community = lazy(() => import('./pages/Community'));
const Plan = lazy(() => import('./pages/Plan'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const Settings = lazy(() => import('./pages/Settings'));

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
    if (user.emailVerified !== true) return <Navigate to="/verificar-correo" replace />;
    if (user.onboardingCompleted !== true) {
      return <Navigate to="/onboarding" replace />;
    }
    const invitation=sessionStorage.getItem('aprueba:group-invitation');
    return <Navigate to={invitation ? '/grupos?invite='+encodeURIComponent(invitation) : '/'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/invitacion" element={<GroupInvitation />} />
          <Route path="/verificar-correo" element={<PrivateRoute verification><VerifyEmail /></PrivateRoute>} />
          <Route path="/recuperar-contrasena" element={<PasswordRecovery />} />
          <Route path="/restablecer-contrasena" element={<PasswordRecovery reset />} />
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
              <PrivateRoute onboarding>
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
            <Route path="tutores/analisis" element={<TutorAnalysis />} />
            <Route path="notificaciones" element={<Notifications />} />
            <Route path="comunidad" element={<Community />} />
            <Route path="plan" element={<Plan />} />
            <Route path="plan-estudio" element={<StudyPlan />} />
            <Route path="ajustes" element={<Settings />} />
          </Route>

          {/* Redirección comodín */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
