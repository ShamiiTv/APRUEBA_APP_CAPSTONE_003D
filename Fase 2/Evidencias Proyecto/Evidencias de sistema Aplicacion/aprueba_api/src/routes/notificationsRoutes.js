import { Router } from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notificationsController.js';

const router = Router();
router.get('/', listNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;