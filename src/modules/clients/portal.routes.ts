import { Router } from 'express';
import { clientsController } from './clients.controller';
import { requireClient } from '../../middleware/auth';

const router = Router();

// --- Public routes ---
// POST /api/portal/login
router.post('/login', (req, res) => clientsController.portalLogin(req, res));

// POST /api/portal/forgot-password
router.post('/forgot-password', (req, res) => clientsController.forgotPassword(req, res));

// POST /api/portal/reset-password/:token
router.post('/reset-password/:token', (req, res) => clientsController.resetPassword(req, res));

// --- Protected portal routes ---
router.use(requireClient);

// GET  /api/portal/me
router.get('/me', (req, res) => clientsController.portalMe(req as any, res));

// PUT  /api/portal/me
router.put('/me', (req, res) => clientsController.updateProfile(req as any, res));

// POST /api/portal/change-password
router.post('/change-password', (req, res) => clientsController.changePassword(req as any, res));

// GET  /api/portal/projects
router.get('/projects', (req, res) =>
  clientsController.portalProjects(req as any, res)
);

// GET  /api/portal/projects/:id
router.get('/projects/:id', (req, res) =>
  clientsController.portalProjectById(req as any, res)
);

export default router;
