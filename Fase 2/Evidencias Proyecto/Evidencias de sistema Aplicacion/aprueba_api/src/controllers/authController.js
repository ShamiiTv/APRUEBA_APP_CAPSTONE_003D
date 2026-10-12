import { db, auth } from '../config/firebase.js';
import { generateTokens } from '../middleware/auth.js';
import { passwordRequest, validEmail, validPassword } from '../services/passwordAuth.js';
import { practiceDate } from '../services/practice.js';
import { profilePatch } from '../services/profileSettings.js';

export async function register(req, res) {
  try {
    const { name, email, password } = req.body || {};

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || !validEmail(email) || !validPassword(password)) {
      return res.fail('Ingresa un nombre, correo válido y contraseña de entre 8 y 128 caracteres', null, 400);
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await db.collection('users').where('emailLower', '==', emailClean).limit(1).get();

    if (!existing.empty) {
      return res.fail('El correo ya se encuentra registrado', null, 409);
    }

    const todayStr = practiceDate();
    const newUserRef = db.collection('users').doc();
    const uid = newUserRef.id;

    // Estructura exacta según el documento de Firestore
    const userData = {
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      email: email.trim(),
      emailLower: emailClean,
      authProvider: 'password',
      onboardingCompleted: false,
      avatarColor: '#1A365D',
      locale: 'es',
      theme: 'light',
      plan: 'free',
      planStatus: 'none',
      streak: 0,
      lastActiveDate: null,
      selectedTests: ['lectora', 'm1'],
      practiceFormat: 'random',
      difficulty: 'd2',
      dailyReminder: true,
      medals: { bronze: 0, silver: 0, gold: 0, diamond: 0, platinum: 0 },
      quota: { used: 0, max: 20, date: todayStr, bonusSchool: 0, bonusAddress: 0, unlimited: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await auth.createUser({ uid, email: emailClean, password, displayName: name.trim() });
    const batch = db.batch();
    batch.set(newUserRef, userData);
    batch.set(newUserRef.collection('medalLedger').doc(), {
      event: 'reward',
      tier: 'bronze',
      amount: 0,
      reason: 'Creación de cuenta y bienvenida a Aprueba',
      createdAt: new Date(),
    });
    try {
      await batch.commit();
    } catch (error) {
      await auth.deleteUser(uid).catch(() => console.error('No se pudo revertir el usuario de Auth creado'));
      throw error;
    }

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan });

    return res.success({
      user: { uid, ...userData },
      tokens,
    }, null, 201);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') return res.fail('El correo ya se encuentra registrado', null, 409);
    return res.fail('No se pudo crear la cuenta. Intenta nuevamente.', null, 503);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
      return res.fail('Correo y contraseña requeridos', null, 400);
    }

    const emailClean = email.trim().toLowerCase();
    const authTime = Date.now();
    const identity = await passwordRequest('signInWithPassword', { email: emailClean, password, returnSecureToken: true });
    const userDoc = await db.collection('users').doc(identity.localId).get();
    if (!userDoc.exists) {
      return res.fail('Credenciales inválidas', null, 401);
    }

    const userData = userDoc.data();
    const uid = userDoc.id;

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan, authTime });

    return res.success({
      user: { uid, ...userData },
      tokens,
    });
  } catch (error) {
    if (['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'USER_DISABLED'].includes(error.code)) {
      return res.fail('Credenciales inválidas. Si tu cuenta es antigua, usa Recuperar contraseña.', null, 401);
    }
    return res.fail('No se pudo iniciar sesión. Intenta nuevamente.', null, 503);
  }
}

export async function getProfile(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      return res.fail('Usuario no encontrado', null, 404);
    }

    return res.success({ uid: doc.id, ...doc.data() });
  } catch (error) {
    return res.fail(error.code === 8 ? 'Firebase alcanzó su cuota de servicio. Intenta más tarde.' : 'No se pudo cargar el perfil. Intenta nuevamente.', { code: error.code === 8 ? 'DATABASE_QUOTA_EXCEEDED' : 'PROFILE_UNAVAILABLE' }, 503);
  }
}

export async function updateProfile(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) {
      return res.fail('Usuario no autenticado', null, 401);
    }

    const patch = profilePatch(req.body);
    const userRef = db.collection('users').doc(uid);
    const profile = await db.runTransaction(async transaction => {
      const doc = await transaction.get(userRef);
      if (!doc.exists) throw Object.assign(new Error('Usuario no encontrado'),{ status:404,code:'USER_NOT_FOUND' });
      const update = { ...patch,updatedAt:new Date() };
      transaction.update(userRef,update);
      return { ...doc.data(),...update,uid };
    });
    return res.success(profile);
  } catch (error) {
    return res.fail(error.status ? error.message : 'No se pudo guardar el perfil. Intenta nuevamente.', { code:error.code || 'PROFILE_UNAVAILABLE',field:error.field }, error.status || 503);
  }
}

export async function completeOnboarding(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) {
      return res.fail('Usuario no autenticado', null, 401);
    }

    const { school, region, selectedTests, practiceFormat, difficulty } = req.body || {};

    if (!Array.isArray(selectedTests) || selectedTests.length === 0 || selectedTests.length > 5 || selectedTests.some(id => !['lectora', 'm1', 'm2', 'cien', 'hist'].includes(id))) {
      return res.fail('Debes seleccionar al menos una prueba PAES', null, 400);
    }
    if ((school !== undefined && (typeof school !== 'string' || school.length > 200)) ||
        (region !== undefined && (typeof region !== 'string' || !region.trim() || region.length > 100)) ||
        (practiceFormat !== undefined && !['random', 'axis'].includes(practiceFormat)) ||
        (difficulty !== undefined && !['d1', 'd2', 'd3'].includes(difficulty))) {
      return res.fail('Los datos de configuración no son válidos', null, 400);
    }

    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.fail('Usuario no encontrado', null, 404);
    }

    const updatePayload = {
      school: school ? school.trim() : '',
      region: region || 'Metropolitana de Santiago',
      selectedTests: [...new Set(selectedTests)],
      practiceFormat: practiceFormat || 'random',
      difficulty: difficulty || 'd2',
      onboardingCompleted: true,
      updatedAt: new Date(),
    };

    await userRef.update(updatePayload);

    const updatedDoc = await userRef.get();
    return res.success({ uid: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    return res.fail(error.code === 8 ? 'Firebase alcanzó su cuota de servicio. Intenta más tarde.' : 'No se pudo cargar el perfil. Intenta nuevamente.', { code: error.code === 8 ? 'DATABASE_QUOTA_EXCEEDED' : 'PROFILE_UNAVAILABLE' }, 503);
  }
}

export async function forgotPassword(req, res) {
  const email = req.body?.email;
  if (!validEmail(email)) return res.fail('Ingresa un correo válido', null, 400);
  try {
    const emailClean = email.trim().toLowerCase();
    // Las cuentas anteriores solo tenían perfil en Firestore. Mantener su UID
    // y exigir demostrar acceso al correo antes de establecer contraseña.
    const profiles = await db.collection('users').where('emailLower', '==', emailClean).limit(2).get();
    if (profiles.docs.length === 1) {
      try {
        await auth.getUser(profiles.docs[0].id);
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
        try {
          await auth.createUser({ uid: profiles.docs[0].id, email: emailClean });
        } catch (createError) {
          if (!['auth/email-already-exists', 'auth/uid-already-exists'].includes(createError.code)) throw createError;
        }
      }
    }
    await passwordRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email: emailClean });
    return res.success({ message: 'Si existe una cuenta para ese correo, recibirás un enlace para restablecer tu contraseña.' });
  } catch (error) {
    if (error.code === 'EMAIL_NOT_FOUND') return res.success({ message: 'Si existe una cuenta para ese correo, recibirás un enlace para restablecer tu contraseña.' });
    return res.fail('No se pudo solicitar la recuperación. Intenta nuevamente.', null, 503);
  }
}

export async function resetPassword(req, res) {
  const { oobCode, password } = req.body || {};
  if (typeof oobCode !== 'string' || !oobCode || oobCode.length > 2048 || !validPassword(password)) {
    return res.fail('Ingresa un enlace válido y una contraseña de entre 8 y 128 caracteres', null, 400);
  }
  try {
    await passwordRequest('resetPassword', { oobCode, newPassword: password });
    return res.success({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  } catch (error) {
    if (['EXPIRED_OOB_CODE', 'INVALID_OOB_CODE'].includes(error.code)) return res.fail('El enlace expiró o ya fue utilizado. Solicita uno nuevo.', null, 400);
    return res.fail('No se pudo actualizar la contraseña. Solicita otro enlace o intenta nuevamente.', null, 503);
  }
}
