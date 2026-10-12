import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  completeOnboarding,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticateToken, refreshSession } from '../middleware/auth.js';
import { createAuthLimiters } from '../middleware/authRateLimiters.js';

const router = Router();

// Rutas públicas
const { loginLimiter, registerLimiter, recoveryLimiter } = createAuthLimiters();
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', recoveryLimiter, forgotPassword);
router.post('/reset-password', recoveryLimiter, resetPassword);
router.post('/refresh', refreshSession);

// Rutas privadas (requieren token)
router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);
router.patch('/me', authenticateToken, updateProfile);

// Alias /profile para estandarizar con el frontend
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.patch('/profile', authenticateToken, updateProfile);

// Ruta para completar el onboarding
router.post('/onboarding', authenticateToken, completeOnboarding);

export default router;
