import { db } from '../config/firebase.js';

// Listar planes disponibles con sus features
export async function getPlans(req, res) {
  try {
    const plansSnap = await db.collection('plans').where('published', '==', true).orderBy('order', 'asc').get();
    const featuresSnap = await db.collection('features').orderBy('order', 'asc').get();

    const featuresMap = {};
    featuresSnap.forEach((fDoc) => {
      featuresMap[fDoc.id] = fDoc.data();
    });

    const plans = [];
    plansSnap.forEach((pDoc) => {
      const pData = pDoc.data();
      const resolvedFeatures = (pData.features || []).map((fId) => featuresMap[fId] || { name: fId });
      plans.push({
        id: pDoc.id,
        ...pData,
        featureDetails: resolvedFeatures,
      });
    });

    return res.success(plans);
  } catch (error) {
    return res.fail(error.message, null, 500);
  }
}

// Suscribirse o cambiar de plan (simulado pasarela Stripe / Webpay)
export async function subscribePlan(req, res) {
  try {
    const uid = req.user?.sub || req.user?.id;
    const { planId, billingCycle = 'monthly' } = req.body;

    if (!planId || !['free', 'uni', 'all'].includes(planId)) {
      return res.fail('Plan no válido', null, 400);
    }

    const userRef = db.collection('users').doc(uid);
    const planRef = db.collection('plans').doc(planId);

    let updatedUserData = null;

    await db.runTransaction(async (transaction) => {
      const uDoc = await transaction.get(userRef);
      if (!uDoc.exists) throw new Error('Usuario no encontrado');

      const pDoc = await transaction.get(planRef);
      if (!pDoc.exists) throw new Error('El plan seleccionado no existe');

      const now = new Date();
      const periodEnd = new Date();
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // 1. Si es plan de pago, registrar en colección subscriptions
      if (planId !== 'free') {
        const subRef = db.collection('subscriptions').doc();
        transaction.set(subRef, {
          userId: uid,
          plan: planId,
          billingCycle,
          status: 'active',
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: `sub_sim_${subRef.id.slice(0, 10)}`,
          stripeCustomerId: `cus_sim_${uid.slice(0, 8)}`,
          paymentMethod: { brand: 'visa', last4: '4242' },
          createdAt: now,
          updatedAt: now,
        });

        // Registrar boleta/recibo en invoices
        const invRef = db.collection('invoices').doc();
        const pData = pDoc.data();
        const price = billingCycle === 'yearly' ? pData.price?.yearly : pData.price?.monthly;

        transaction.set(invRef, {
          userId: uid,
          subscriptionId: subRef.id,
          amount: price || 0,
          currency: 'CLP',
          status: 'paid',
          paidAt: now,
          stripeInvoiceId: `in_sim_${invRef.id.slice(0, 10)}`,
        });
      }

      // 2. Actualizar el documento del usuario (users/{uid})
      const isUnlimited = planId !== 'free';
      const quotaUpdate = {
        used: uDoc.data().quota?.used || 0,
        max: isUnlimited ? 0 : 20,
        date: new Date().toISOString().split('T')[0],
        bonusSchool: uDoc.data().quota?.bonusSchool || 0,
        bonusAddress: uDoc.data().quota?.bonusAddress || 0,
        unlimited: isUnlimited,
      };

      const userPatch = {
        plan: planId,
        planStatus: planId === 'free' ? 'none' : 'active',
        quota: quotaUpdate,
        updatedAt: now,
      };

      transaction.update(userRef, userPatch);
      updatedUserData = { ...uDoc.data(), ...userPatch };
    });

    return res.success({
      message: `Plan ${planId} activado exitosamente`,
      user: updatedUserData,
    });
  } catch (error) {
    return res.fail(error.message, null, 400);
  }
}