import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  completeOnboarding,
  forgotPassword,
  resetPassword,
  sendVerification,
  changePassword,
  createSocialSession,
  deleteAccount,
} from '../controllers/authController.js';
import { authenticateToken, refreshSession, requireVerifiedEmail } from '../middleware/auth.js';
import { createAuthLimiters } from '../middleware/authRateLimiters.js';

const router = Router();

// Rutas públicas
const { loginLimiter, registerLimiter, recoveryLimiter, verificationLimiter } = createAuthLimiters();
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', recoveryLimiter, forgotPassword);
router.post('/reset-password', recoveryLimiter, resetPassword);
router.post('/refresh', refreshSession);
router.post('/verify-email', authenticateToken, verificationLimiter, sendVerification);
router.post('/password', authenticateToken, recoveryLimiter, changePassword);
router.post('/social-session', authenticateToken, recoveryLimiter, createSocialSession);

// Rutas privadas (requieren token)
router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);
router.patch('/me', authenticateToken, updateProfile);
router.delete('/me', authenticateToken, recoveryLimiter, deleteAccount);

// Alias /profile para estandarizar con el frontend
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.patch('/profile', authenticateToken, updateProfile);

// Ruta para completar el onboarding
router.post('/onboarding', authenticateToken, requireVerifiedEmail, completeOnboarding);

export default router;