import { Router } from 'express';
import { getMyGroups, createGroup, joinGroup } from '../controllers/groupsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyGroups);
router.post('/', createGroup);
router.post('/join', joinGroup);

export default router;