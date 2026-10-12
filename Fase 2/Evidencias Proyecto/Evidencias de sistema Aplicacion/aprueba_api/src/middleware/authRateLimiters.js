import rateLimit from 'express-rate-limit';
export function createAuthLimiters(production = process.env.NODE_ENV === 'production') {
const limiterOptions = { windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false,
  message: { data: null, error: { code: 'AUTH_RATE_LIMITED', message: 'Demasiados intentos. Intenta más tarde.' }, meta: null } };
// Successful sign-ins do not exhaust the failure budget. Each account has a
// separate budget even when the hosting gateway exposes a shared source IP.
const loginLimiter = rateLimit({ ...limiterOptions, max: production ? 10 : 1000,
  skipSuccessfulRequests: true,
  keyGenerator: req => typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : 'invalid-email' });
const registerLimiter = rateLimit({ ...limiterOptions, max: production ? 30 : 1000 });
const recoveryLimiter = rateLimit({ ...limiterOptions, max: production ? 10 : 1000 });
return { loginLimiter, registerLimiter, recoveryLimiter };
}
