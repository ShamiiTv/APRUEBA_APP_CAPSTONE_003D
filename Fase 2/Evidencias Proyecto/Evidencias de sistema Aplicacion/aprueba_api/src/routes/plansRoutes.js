import { Router } from 'express';
import { getPlans, subscribePlan } from '../controllers/plansController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPlans);
router.post('/subscribe', subscribePlan);

export default router;