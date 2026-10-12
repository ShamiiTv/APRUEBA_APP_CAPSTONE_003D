import jwt from 'jsonwebtoken';
import { auth, db } from '../config/firebase.js';
const verifiedSession = Symbol('verifiedSession');

function secret(type) {
  const value = process.env[type === 'refresh' ? 'JWT_REFRESH_SECRET' : 'JWT_SECRET'];
  if (!value) throw new Error('Configura JWT_SECRET y JWT_REFRESH_SECRET antes de iniciar la API');
  return value;
}

export function validateAuthConfiguration() {
  secret('access');
  secret('refresh');
  if (process.env.NODE_ENV === 'production' && process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('No se permite Firebase Auth Emulator en producción');
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIREBASE_WEB_API_KEY) {
    throw new Error('Configura FIREBASE_WEB_API_KEY para Firebase Authentication');
  }
}

export function generateTokens(payload) {
  const common = {
    sub: payload.id || payload.sub,
    id: payload.id || payload.sub,
    role: payload.role || 'student',
    plan: payload.plan || 'free',
    authTime: payload.authTime ?? Date.now(),
  };
  return {
    accessToken: jwt.sign({ ...common, type: 'access' }, secret('access'), { algorithm: 'HS256', expiresIn: '15m' }),
    refreshToken: jwt.sign({ ...common, type: 'refresh' }, secret('refresh'), { algorithm: 'HS256', expiresIn: '30d' }),
  };
}

async function verifySession(token, type) {
  const decoded = jwt.verify(token, secret(type), { algorithms: ['HS256'] });
  if (decoded.type !== type || typeof decoded.sub !== 'string' || !Number.isFinite(decoded.authTime)) throw new Error('Token inválido');
  const account = await auth.getUser(decoded.sub);
  if (account.disabled || decoded.authTime < Date.parse(account.tokensValidAfterTime || '1970-01-01')) throw new Error('Sesión revocada');
  return decoded;
}

export async function authenticateToken(req, res, next) {
  // Un mismo request pasa por la protección global y por la del router.
  if (req[verifiedSession]) return next();
  const match = /^Bearer (\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.fail('Acceso denegado. Token no proporcionado.', null, 401);
  try {
    req.user = await verifySession(match[1], 'access');
    req[verifiedSession] = true;
    return next();
  } catch (error) {
    if (error.code && !['auth/user-not-found', 'auth/id-token-revoked'].includes(error.code)) return res.fail('No se pudo verificar la sesión. Intenta nuevamente.', null, 503);
    return res.fail('Sesión inválida o expirada. Inicia sesión nuevamente.', null, 401);
  }
}

export async function refreshSession(req, res) {
  if (typeof req.body?.refreshToken !== 'string') return res.fail('Sesión inválida', null, 401);
  try {
    const decoded = await verifySession(req.body.refreshToken, 'refresh');
    const profile = await db.collection('users').doc(decoded.sub).get();
    if (!profile.exists) return res.fail('Sesión inválida', null, 401);
    return res.success({ tokens: generateTokens({ ...decoded, plan: profile.data().plan }) });
  } catch (error) {
    if (error.code && error.code !== 'auth/user-not-found') return res.fail('No se pudo renovar la sesión', null, 503);
    return res.fail('Sesión inválida o expirada. Inicia sesión nuevamente.', null, 401);
  }
}

export async function requireOnboarding(req, res, next) {
  try {
    const profile = await db.collection('users').doc(req.user.sub).get();
    if (!profile.exists) return res.fail('Usuario no encontrado', null, 401);
    if (profile.data().onboardingCompleted !== true) return res.fail('Completa tu configuración inicial para continuar', { code: 'ONBOARDING_REQUIRED' }, 403);
    return next();
  } catch {
    return res.fail('No se pudo verificar tu configuración inicial', null, 503);
  }
}
