import { Router } from 'express';
import { createSupportTicket, getMyTickets, submitCorrection } from '../controllers/supportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/tickets', getMyTickets);
router.post('/tickets', createSupportTicket);
router.post('/corrections', submitCorrection);

export default router;