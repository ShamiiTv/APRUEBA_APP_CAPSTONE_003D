import { Router } from 'express';
import { getPlans, subscribePlan } from '../controllers/plansController.js';
import { authenticateToken } from '../middleware/auth.js';

import {createPaypalSubscription,getPaypalSubscription,cancelPaypalSubscription} from '../controllers/paypalController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPlans);
router.post('/subscribe', subscribePlan);
router.post('/paypal',createPaypalSubscription);
router.get('/paypal',getPaypalSubscription);
router.post('/paypal/cancel',cancelPaypalSubscription);

export default router;