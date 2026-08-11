import { Router } from 'express';
import { adminsController } from './admins.controller';
import { requireSuperAdmin } from '../../middleware/auth';

const router = Router();

// All routes require super admin
router.use(requireSuperAdmin as any);

// GET  /api/admins          — list all admins
router.get('/', (req, res) => adminsController.list(req as any, res));

// GET  /api/admins/:id      — get a single admin
router.get('/:id', (req, res) => adminsController.getById(req as any, res));

// POST /api/admins/:id/approve   — approve a pending admin
router.post('/:id/approve', (req, res) => adminsController.approve(req as any, res));

// POST /api/admins/:id/revoke    — revoke access (sets approved = false)
router.post('/:id/revoke', (req, res) => adminsController.revoke(req as any, res));

// PUT  /api/admins/:id/role      — change role (SUPER_ADMIN | ADMIN)
router.put('/:id/role', (req, res) => adminsController.changeRole(req as any, res));

// DELETE /api/admins/:id         — delete admin account
router.delete('/:id', (req, res) => adminsController.remove(req as any, res));

export default router;
