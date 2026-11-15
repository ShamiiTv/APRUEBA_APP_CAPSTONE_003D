import { Router } from 'express';
import { getMedalsSummary, exchangeMedals, getBenefits, redeemBenefit } from '../controllers/medalsController.js';
import { authenticateToken } from '../middleware/auth.js';
import { getGifts, sendGifts } from '../controllers/giftsController.js';

const router = Router();

router.get('/', authenticateToken, getMedalsSummary);
router.get('/gifts', authenticateToken, getGifts);
router.post('/gifts', authenticateToken, sendGifts);
router.post('/exchange', authenticateToken, exchangeMedals);
router.get('/benefits', authenticateToken, getBenefits);
router.post('/benefits/redeem', authenticateToken, redeemBenefit);

export default router;
