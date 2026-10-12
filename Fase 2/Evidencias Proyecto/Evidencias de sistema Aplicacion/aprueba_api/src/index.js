import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { db } from './config/firebase.js';
import { responseHandler } from './middleware/responseHandler.js';
import authRoutes from './routes/authRoutes.js';
import practiceRoutes from './routes/practiceRoutes.js';
import { getProgress } from './controllers/progressController.js';
import { getStudyPlan, saveStudyPlan } from './controllers/studyPlanController.js';
import { getTests } from './controllers/testsController.js';
import medalsRoutes from './routes/medalsRoutes.js';
import groupsRoutes from './routes/groupsRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import plansRoutes from './routes/plansRoutes.js';
import skillsRoutes from './routes/skillsRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import tutorsRoutes from './routes/tutorsRoutes.js';
import { validateAuthConfiguration, authenticateToken, requireOnboarding } from './middleware/auth.js';

validateAuthConfiguration();
const app = express();
// Nginx on the same server is the only trusted reverse proxy.
app.set('trust proxy', 'loopback');

app.use(helmet());
app.use(cors());
app.use(express.json());

// 1. Limiter general amplio para desarrollo (evita bloqueos accidentales)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    data: null,
    error: { message: 'Demasiadas solicitudes generales desde esta IP, intente más tarde.' },
    meta: null,
  },
});
app.use(generalLimiter);

app.use(responseHandler);

// Ruta de salud
app.get('/api/v1/health', async (req, res) => {
  try {
    await db.collection('_health').limit(1).get();
    return res.success({ status: 'ok', database: process.env.FIRESTORE_EMULATOR_HOST ? 'connected (emulator)' : 'connected (Firebase)' });
  } catch (error) {
    return res.fail('No se pudo consultar Firebase. Intenta más tarde.', { code: error.code === 8 ? 'DATABASE_QUOTA_EXCEEDED' : 'DATABASE_UNAVAILABLE' }, 503);
  }
});

// Rutas de Autenticación con su limiter específico
app.use('/api/v1/auth', authRoutes);
app.get('/api/v1/tests', authenticateToken, getTests);

// Rutas funcionales del sistema
app.use(['/api/v1/progress', '/api/v1/practice', '/api/v1/medals', '/api/v1/groups', '/api/v1/posts', '/api/v1/plans', '/api/v1/skills', '/api/v1/support', '/api/v1/tutors'], authenticateToken, requireOnboarding);
app.get('/api/v1/progress', getProgress);
app.use('/api/v1/study-plan', authenticateToken, requireOnboarding);
app.get('/api/v1/study-plan', getStudyPlan);
app.put('/api/v1/study-plan', saveStudyPlan);
app.use('/api/v1/practice', practiceRoutes);
app.use('/api/v1/medals', medalsRoutes);
app.use('/api/v1/groups', groupsRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/plans', plansRoutes);
app.use('/api/v1/skills', skillsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/tutors', tutorsRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  return res.fail('Ruta no encontrada', null, 404);
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  return res.fail('Error interno del servidor', null, 500);
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`API en http://localhost:${PORT}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
