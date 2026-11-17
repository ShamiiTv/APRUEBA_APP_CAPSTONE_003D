import {clientTokens} from '../services/browserSession.js';
import {profileView} from '../services/profileView.js';
import { db, auth } from '../config/firebase.js';
import { generateTokens } from '../middleware/auth.js';
import { passwordRequest, validEmail, validPassword } from '../services/passwordAuth.js';
import { practiceDate, dailyQuota } from '../services/practice.js';
import { profilePatch } from '../services/profileSettings.js';
import { balances } from '../services/medals.js';
import { leaveGroupsOnDelete, removeUserReactions } from '../services/accountDeletion.js';

// Día calendario en hora de Chile (YYYY-MM-DD), para que el "día" no cambie a las 21:00.
function chileDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(date);
}

function previousDay(day) {
  const d = new Date(`${day}T12:00:00Z`);
  return new Date(d.getTime() - 86400000).toISOString().slice(0, 10);
}

export async function register(req, res) {
  try {
    const { name, email, password, consent, locale = 'es' } = req.body || {};
    if ((consent !== undefined && consent !== true) || !['es','en'].includes(locale)) return res.fail('Revisa el consentimiento y el idioma de tu cuenta', null, 400);

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || !validEmail(email) || !validPassword(password)) {
      return res.fail('Ingresa un nombre, correo válido y contraseña de entre 8 y 128 caracteres', null, 400);
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await db.collection('users').where('emailLower', '==', emailClean).limit(1).get();

    if (!existing.empty) {
      return res.fail('El correo ya se encuentra registrado', null, 409);
    }

    const todayStr = practiceDate();
    const loginDay = chileDate();
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
      locale,
      ...(consent === true ? { dataConsent: { accepted: true, version: '2026-11-16', acceptedAt: new Date() } } : {}),
      theme: 'light',
      plan: 'free',
      planStatus: 'none',
      streak: 0,
      lastActiveDate: null,
      selectedTests: ['lectora', 'm1'],
      practiceFormat: 'random',
      difficulty: 'd2',
      dailyReminder: true,
      medals: { bronze: 1, silver: 0, gold: 0, diamond: 0, platinum: 0 },
      loginStreak: 1,
      lastLoginDate: loginDay,
      quota: { used: 0, max: 10, date: todayStr, bonusSchool: 0, bonusAddress: 0, unlimited: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await auth.createUser({ uid, email: emailClean, password, displayName: name.trim() });
    const batch = db.batch();
    batch.set(newUserRef, userData);
    batch.set(newUserRef.collection('medalLedger').doc(), {
      event: 'reward',
      tier: 'bronze',
      amount: 1,
      reason: 'Creación de cuenta y bienvenida a Aprueba',
      createdAt: new Date(),
    });
        batch.set(newUserRef.collection('notifications').doc(), {
      type: 'medal_reward',
      title: '+1 Medalla de Bronce',
      body: 'Bienvenida a Aprueba. ¡Gracias por crear tu cuenta!',
      read: false,
      createdAt: new Date(),
    });
    try {
      await batch.commit();
    } catch (error) {
      await auth.deleteUser(uid).catch(() => console.error('No se pudo revertir el usuario de Auth creado'));
      throw error;
    }

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan });

    let verificationEmailSent = false;
    try {
      const identity = await passwordRequest('signInWithPassword', { email: emailClean, password, returnSecureToken: true });
      await passwordRequest('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: identity.idToken });
      verificationEmailSent = true;
    } catch {
      // La cuenta ya existe: un fallo de correo se recupera mediante reenvío.
      console.warn('No se pudo enviar el correo inicial de verificación');
    }
    return res.success({
      user: { uid, ...profileView(userData), emailVerified: false },
      verificationEmailSent,
      tokens:clientTokens(req,res,tokens),
      rewards: [{ type: 'welcome', tier: 'bronze', amount: 1, reason: 'Bienvenida a Aprueba', streak: 1 }],
            dailyLoginReward: { tier: 'bronze', amount: 1, streak: 1 },
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

    let userData = userDoc.data();
    const uid = userDoc.id;
    const userRef = userDoc.ref;
    const account = await auth.getUser(uid);
    const rewards = [];

    // +1 bronce la primera vez que entra cada día. Si falla, el login igual funciona.
    try {
      const result = await db.runTransaction(async tx => {
        const snap = await tx.get(userRef);
        const current = snap.data();
        const today = chileDate();
        if (current.lastLoginDate === today) return { data: current, reward: null };

        const streak = current.lastLoginDate === previousDay(today) ? (current.loginStreak || 0) + 1 : 1;
        const medals = balances(current.medals);
        medals.bronze += 1;
        const patch = { medals, loginStreak: streak, lastLoginDate: today, updatedAt: new Date() };

        tx.update(userRef, patch);
        tx.set(userRef.collection('medalLedger').doc(), {
          event: 'reward',
          tier: 'bronze',
          amount: 1,
          reason: `Inicio de sesión diario (día ${streak} seguido)`,
          createdAt: new Date(),
        });
        tx.set(userRef.collection('notifications').doc(), {
          type: 'medal_reward',
          title: '+1 Medalla de Bronce',
          body: streak > 1 ? `Inicio de sesión diario · ¡Día ${streak} seguido!` : 'Inicio de sesión diario',
          read: false,
          createdAt: new Date(),
        });
        return {
          data: { ...current, ...patch },
          reward: { type: 'daily_login', tier: 'bronze', amount: 1, reason: 'Inicio de sesión diario', streak },
        };
      });
      userData = result.data;
      if (result.reward) rewards.push(result.reward);
    } catch (rewardError) {
      console.warn('No se pudo registrar la medalla de inicio de sesión', rewardError.message);
    }

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan, authTime });

        const daily = rewards.find(r => r.type === 'daily_login');

    return res.success({
      user: { uid, ...profileView(userData), emailVerified: account.emailVerified === true },
      tokens:clientTokens(req,res,tokens),
      rewards,
      dailyLoginReward: daily
        ? { tier: daily.tier, amount: daily.amount, streak: daily.streak }
        : null,
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

    const account = req.user.firebaseAccount || await auth.getUser(uid);
    return res.success({ uid: doc.id, ...profileView(doc.data()), quota:dailyQuota(doc.data()), emailVerified:account.emailVerified, phoneVerified:!!account.phoneNumber && account.phoneNumber===doc.data().phone, linkedProviders:account.providerData.map(provider => provider.providerId),availableSocialProviders:(process.env.FIREBASE_SOCIAL_PROVIDERS || 'google.com').split(',').map(value=>value.trim()).filter(value=>['google.com','facebook.com'].includes(value)) });
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
      const update = { ...patch,quota:dailyQuota({...doc.data(),...patch}),updatedAt:new Date() };
      transaction.update(userRef,update);
      return { ...doc.data(),...update,uid };
    });
    return res.success({...profileView(profile),uid});
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
      school: school !== undefined ? school.trim() : doc.data().school || '',
      region: region !== undefined ? region.trim() : doc.data().region || '',
      selectedTests: [...new Set(selectedTests)],
      practiceFormat: practiceFormat || 'random',
      difficulty: difficulty || 'd2',
      onboardingCompleted: true,
      updatedAt: new Date(),
    };
    updatePayload.quota = dailyQuota({...doc.data(),...updatePayload});
    await userRef.update(updatePayload);

    const updatedDoc = await userRef.get();
    return res.success({ uid: updatedDoc.id, ...profileView(updatedDoc.data()) });
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

// Reautenticación de Firebase: nunca confiamos en una marca enviada por el cliente.
async function reauthenticate(req) {
  const account = await auth.getUser(req.user.sub);
  const password = req.body?.currentPassword;
  if (typeof password !== 'string' || !password || password.length > 128) throw Object.assign(new Error('Ingresa tu contraseña actual'),{status:400});
  const identity = await passwordRequest('signInWithPassword',{email:account.email,password,returnSecureToken:true});
  if (identity.localId !== req.user.sub) throw new Error('Identidad inválida');
  return identity;
}

export async function sendVerification(req,res) {
  try {
    const identity = await reauthenticate(req);
    await passwordRequest('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:identity.idToken});
    return res.success({sent:true});
  } catch(error) { return res.fail('No se pudo enviar la verificación. Revisa tu contraseña e intenta nuevamente.',null,error.status === 400 ? 400 : 503); }
}

export async function createSocialSession(req,res) {
  try {
    await reauthenticate(req);
    const customToken=await auth.createCustomToken(req.user.sub);
    return res.success({uid:req.user.sub,customToken,config:{apiKey:process.env.FIREBASE_WEB_API_KEY,projectId:process.env.FIREBASE_PROJECT_ID || 'aprueba-app-9d317',authDomain:process.env.FIREBASE_AUTH_DOMAIN || 'aprueba-app-9d317.firebaseapp.com'}});
  } catch {return res.fail('No se pudo preparar la vinculación. Revisa tu contraseña actual.',null,400);}
}

export async function changePassword(req,res) {
  if (!validPassword(req.body?.newPassword)) return res.fail('La nueva contraseña debe tener entre 8 y 128 caracteres',null,400);
  try {
    const identity = await reauthenticate(req);
    await passwordRequest('update',{idToken:identity.idToken,password:req.body.newPassword,returnSecureToken:true});
    await auth.revokeRefreshTokens(req.user.sub);
    return res.success({message:'Contraseña actualizada. Inicia sesión nuevamente.'});
  } catch { return res.fail('No se pudo cambiar la contraseña. Revisa tu contraseña actual.',null,400); }
}


// Borra los tickets de soporte del usuario (y sus mensajes).
async function deleteSupportTickets(uid) {
  const tickets = await db.collection('supportTickets').where('userId', '==', uid).get();
  for (const doc of tickets.docs) await db.recursiveDelete(doc.ref);
}

// Borra las recorrecciones del usuario.
async function deleteCorrections(uid) {
  const corrections = await db.collection('corrections').where('userId', '==', uid).get();
  for (const doc of corrections.docs) await db.recursiveDelete(doc.ref);
}

// Anonimiza las publicaciones del usuario para no romper hilos de otros.
async function anonymizePosts(uid) {
  const posts = await db.collection('posts').where('authorUid', '==', uid).get();
  for (let i = 0; i < posts.docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of posts.docs.slice(i, i + 400)) {
      batch.update(doc.ref, { author: { name: 'Usuario eliminado' }, authorUid: null });
    }
    await batch.commit();
  }
}

// Anonimiza los comentarios del usuario en todos los posts.
async function anonymizeComments(uid) {
  const comments = await db.collectionGroup('comments').where('authorUid', '==', uid).get();
  for (let i = 0; i < comments.docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of comments.docs.slice(i, i + 400)) {
      batch.update(doc.ref, { author: { name: 'Usuario eliminado' }, authorUid: null });
    }
    await batch.commit();
  }
}

export async function deleteAccount(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) return res.fail('Usuario no autenticado', null, 401);

    // Pide la contraseña actual y verifica que sea de esta cuenta.
    await reauthenticate(req);

    // Stop the sandbox subscription before removing its owner.
    const paypalUser=await db.collection('users').doc(uid).get();
    if(paypalUser.data()?.paypalSubscriptionId){
      const {cancelPaypalPlan}=await import('../services/paypalPlans.js');
      await cancelPaypalPlan(uid);
    }
    const paypalRecords=await db.collection('paypalSandboxSubscriptions').where('uid','==',uid).get();
    for(const record of paypalRecords.docs){
      if(record.data().abandoned)await record.ref.update({uid:null});
      else await record.ref.delete();
    }

    const paypalSales=await db.collection('paypalSandboxSales').where('uid','==',uid).get();
    for(const sale of paypalSales.docs)await sale.ref.delete();

    // Limpia lo que el usuario dejó en otras colecciones.
    await leaveGroupsOnDelete(uid);
    await removeUserReactions(uid);
    await deleteSupportTickets(uid);
    await deleteCorrections(uid);
    await anonymizePosts(uid);
    await anonymizeComments(uid);

    // Borra users/{uid} y todas sus subcolecciones (medalLedger, etc.).
    await db.recursiveDelete(db.collection('users').doc(uid));

    // Borra la cuenta de Firebase Auth (si ya no existe, no es error).
    await auth.deleteUser(uid).catch(error => {
      if (error.code !== 'auth/user-not-found') throw error;
    });

    return res.success({ deleted: true });
  } catch (error) {
    if (['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD'].includes(error.code)) {
      return res.fail('Contraseña incorrecta', {code:'AUTH_INVALID_CREDENTIALS'}, 401);
    }
    if (error.status === 400) return res.fail(error.message, null, 400);
    return res.fail('No se pudo eliminar la cuenta. Intenta nuevamente.', null, 503);
  }
}