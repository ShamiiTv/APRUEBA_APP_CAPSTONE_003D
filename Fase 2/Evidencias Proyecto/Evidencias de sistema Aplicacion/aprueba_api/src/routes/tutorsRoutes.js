import { Router } from 'express';
import { getTutors, requestTutorSession } from '../controllers/tutorsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getTutors);
router.post('/request', requestTutorSession);

export default router;