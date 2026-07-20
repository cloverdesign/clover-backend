import { Router } from 'express';
import { clientsController } from './clients.controller';
import { requireClient } from '../../middleware/auth';

const router = Router();

// ── Public (no session required) ──────────────────────────────────────────────
// POST /api/portal/request-otp   { email }
router.post('/request-otp', (req, res) => clientsController.requestOtp(req, res));

// POST /api/portal/verify-otp    { email, code }
router.post('/verify-otp', (req, res) => clientsController.verifyOtp(req, res));

// ── Protected (session token required) ───────────────────────────────────────
router.use(requireClient as any);

// POST /api/portal/logout
router.post('/logout', (req, res) => clientsController.logout(req as any, res));

// GET  /api/portal/me
router.get('/me', (req, res) => clientsController.portalMe(req as any, res));

// PUT  /api/portal/me
router.put('/me', (req, res) => clientsController.updateProfile(req as any, res));

// GET  /api/portal/projects
router.get('/projects', (req, res) => clientsController.portalProjects(req as any, res));

// GET  /api/portal/projects/:id
router.get('/projects/:id', (req, res) => clientsController.portalProjectById(req as any, res));

export default router;
