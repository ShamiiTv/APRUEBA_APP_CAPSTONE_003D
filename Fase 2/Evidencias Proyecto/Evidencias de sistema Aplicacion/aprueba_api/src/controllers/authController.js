import { db } from '../config/firebase.js';
import { generateTokens } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.fail('Nombre, correo y contraseña son obligatorios', null, 400);
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await db.collection('users').where('emailLower', '==', emailClean).limit(1).get();

    if (!existing.empty) {
      return res.fail('El correo ya se encuentra registrado', null, 409);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newUserRef = db.collection('users').doc();
    const uid = newUserRef.id;

    // Estructura exacta según el documento de Firestore
    const userData = {
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      email: email.trim(),
      emailLower: emailClean,
      authProvider: 'password',
      avatarColor: '#1A365D',
      locale: 'es',
      theme: 'light',
      plan: 'free',
      planStatus: 'none',
      streak: 1,
      lastActiveDate: todayStr,
      selectedTests: ['lectora', 'm1'],
      practiceFormat: 'random',
      difficulty: 'd2',
      dailyReminder: true,
      medals: { bronze: 0, silver: 0, gold: 0, diamond: 0, platinum: 0 },
      quota: { used: 0, max: 20, date: todayStr, bonusSchool: 0, bonusAddress: 0, unlimited: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newUserRef.set(userData);

    // Registro inicial en medalLedger (primer movimiento de saldo inicial)
    await newUserRef.collection('medalLedger').add({
      event: 'reward',
      tier: 'bronze',
      amount: 0,
      reason: 'Creación de cuenta y bienvenida a Aprueba',
      createdAt: new Date(),
    });

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan });

    return res.success({
      user: { uid, ...userData },
      tokens,
    }, null, 201);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.fail('Correo y contraseña requeridos', null, 400);
    }

    const emailClean = email.trim().toLowerCase();
    const snapshot = await db.collection('users').where('emailLower', '==', emailClean).limit(1).get();

    if (snapshot.empty) {
      return res.fail('Credenciales inválidas', null, 401);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    const tokens = generateTokens({ id: uid, role: 'student', plan: userData.plan });

    return res.success({
      user: { uid, ...userData },
      tokens,
    });
  } catch (error) {
    return res.fail(error.message, null, 500);
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
    return res.fail(error.message, null, 500);
  }
}

export async function updateProfile(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) {
      return res.fail('Usuario no autenticado', null, 401);
    }

    const { name, school, region, targetTestId, theme, lang } = req.body;
    const userRef = db.collection('users').doc(uid);

    const doc = await userRef.get();
    if (!doc.exists) {
      return res.fail('Usuario no encontrado', null, 404);
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.nameLower = name.trim().toLowerCase();
    }
    if (school !== undefined) updateData.school = school.trim();
    if (region !== undefined) updateData.region = region.trim();
    if (targetTestId !== undefined) updateData.targetTestId = targetTestId;
    if (theme !== undefined) updateData.theme = theme;
    if (lang !== undefined) updateData.locale = lang;

    await userRef.update(updateData);

    const updatedDoc = await userRef.get();
    return res.success({ uid: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

export async function completeOnboarding(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    if (!uid) {
      return res.fail('Usuario no autenticado', null, 401);
    }

    const { school, region, selectedTests, practiceFormat, difficulty } = req.body;

    if (!selectedTests || !Array.isArray(selectedTests) || selectedTests.length === 0) {
      return res.fail('Debes seleccionar al menos una prueba PAES', null, 400);
    }

    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.fail('Usuario no encontrado', null, 404);
    }

    const updatePayload = {
      school: school ? school.trim() : '',
      region: region || 'Metropolitana de Santiago',
      selectedTests,
      practiceFormat: practiceFormat || 'random',
      difficulty: difficulty || 'd2',
      onboardingCompleted: true,
      updatedAt: new Date(),
    };

    await userRef.update(updatePayload);

    const updatedDoc = await userRef.get();
    return res.success({ uid: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}