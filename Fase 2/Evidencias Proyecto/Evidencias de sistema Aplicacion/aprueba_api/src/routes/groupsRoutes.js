import { Router } from 'express';
import { getMyGroups, getPublicGroups, createGroup, joinGroup, getGroup, leaveGroup } from '../controllers/groupsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyGroups);
router.get('/public',getPublicGroups);
router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/:id', getGroup);
router.post('/:id/leave', leaveGroup);

export default router;
