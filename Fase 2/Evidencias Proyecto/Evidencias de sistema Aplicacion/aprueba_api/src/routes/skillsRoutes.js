import { Router } from 'express';
import { getSkills, getSkillById } from '../controllers/skillsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', getSkills);
router.get('/:skillId', getSkillById);

export default router;