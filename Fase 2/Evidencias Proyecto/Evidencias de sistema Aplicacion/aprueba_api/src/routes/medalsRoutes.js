import { Router } from 'express';
import { getMedalsSummary, exchangeMedals, getBenefits } from '../controllers/medalsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, getMedalsSummary);
router.post('/exchange', authenticateToken, exchangeMedals);
router.get('/benefits', authenticateToken, getBenefits);

export default router;