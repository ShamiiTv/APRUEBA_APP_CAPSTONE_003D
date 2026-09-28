import { db } from '../config/firebase.js';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

// Obtener saldos e historial de movimientos
export async function getMedalsSummary(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.fail('Usuario no encontrado', null, 404);
    }

    const userData = userDoc.data();
    const medals = userData.medals || { bronze: 0, silver: 0, gold: 0, diamond: 0, platinum: 0 };

    const ledgerSnap = await db.collection('users').doc(uid)
      .collection('medalLedger')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const history = [];
    ledgerSnap.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    return res.success({ medals, history });
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Canjear 5 medallas por 1 del siguiente nivel (Transacción atómica)
export async function exchangeMedals(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { fromTier } = req.body;

    const fromIndex = TIER_ORDER.indexOf(fromTier);
    if (fromIndex === -1 || fromIndex >= TIER_ORDER.length - 1) {
      return res.fail('Nivel de canje inválido', null, 400);
    }

    const toTier = TIER_ORDER[fromIndex + 1];
    const userRef = db.collection('users').doc(uid);
    let updatedMedals = null;

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('Usuario no encontrado');

      const userData = userDoc.data();
      const medals = userData.medals || { bronze: 0, silver: 0, gold: 0, diamond: 0, platinum: 0 };

      if ((medals[fromTier] || 0) < 5) {
        throw new Error(`Necesitas al menos 5 medallas de ${fromTier} para canjear`);
      }

      medals[fromTier] -= 5;
      medals[toTier] = (medals[toTier] || 0) + 1;
      updatedMedals = medals;

      // Actualizar documento de usuario
      transaction.update(userRef, { medals, updatedAt: new Date() });

      // Registrar movimiento de salida en medalLedger
      const outRef = userRef.collection('medalLedger').doc();
      transaction.set(outRef, {
        event: 'exchange',
        tier: fromTier,
        amount: -5,
        reason: `Canje de 5 ${fromTier} por 1 ${toTier}`,
        createdAt: new Date(),
      });

      // Registrar movimiento de entrada en medalLedger
      const inRef = userRef.collection('medalLedger').doc();
      transaction.set(inRef, {
        event: 'exchange',
        tier: toTier,
        amount: 1,
        reason: `Obtenida por canje de 5 ${fromTier}`,
        createdAt: new Date(),
      });
    });

    return res.success({ medals: updatedMedals, upgradedTier: toTier });
  } catch (error) {
    return res.fail(error.message, null, 400);
  }
}

// Listar beneficios canjeables con Platino
export async function getBenefits(req, res) {
  try {
    const snapshot = await db.collection('benefits').where('active', '==', true).get();
    const benefits = [];
    snapshot.forEach(doc => {
      benefits.push({ id: doc.id, ...doc.data() });
    });
    return res.success(benefits);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}