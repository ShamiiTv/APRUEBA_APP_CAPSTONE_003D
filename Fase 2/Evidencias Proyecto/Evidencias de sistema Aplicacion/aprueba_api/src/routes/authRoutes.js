import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  completeOnboarding,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas privadas (requieren token)
router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);

// Alias /profile para estandarizar con el frontend
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

// Ruta para completar el onboarding
router.post('/onboarding', authenticateToken, completeOnboarding);

export default router;