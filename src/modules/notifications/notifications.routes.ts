import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.use(requireAdmin);

// GET   /api/notifications
router.get('/', (req, res) => notificationsController.list(req, res));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => notificationsController.markRead(req, res));

// POST  /api/notifications/read-all
router.post('/read-all', (req, res) => notificationsController.markAllRead(req, res));

export default router;
