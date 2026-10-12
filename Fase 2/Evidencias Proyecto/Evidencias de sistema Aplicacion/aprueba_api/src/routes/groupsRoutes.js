import { Router } from 'express';
import { getMyGroups, createGroup, joinGroup, getGroup, leaveGroup } from '../controllers/groupsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyGroups);
router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:id', getGroup);
router.post('/:id/leave', leaveGroup);

export default router;
