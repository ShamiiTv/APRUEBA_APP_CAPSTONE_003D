import { Router } from 'express';
import { getNextQuestion, submitAnswer,getLevels } from '../controllers/practiceController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/next', authenticateToken, getNextQuestion);
router.get('/levels',authenticateToken,getLevels);
router.post('/answers', authenticateToken, submitAnswer);

export default router;
