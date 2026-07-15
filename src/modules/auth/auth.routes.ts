import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => authController.login(req, res));

// POST /api/auth/register
router.post('/register', (req, res) => authController.register(req, res));

// GET /api/auth/me
router.get('/me', requireAdmin, (req, res) =>
  authController.getMe(req as any, res)
);

export default router;
