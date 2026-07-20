import { Router } from 'express';
import { revisionsController } from './revisions.controller';
import { requireAdmin, requireClient } from '../../middleware/auth';

// ── Admin routes: /api/revision-requests ─────────────────────────────────────
export const adminRevisionRouter = Router();
adminRevisionRouter.use(requireAdmin);
adminRevisionRouter.get('/',                    (req, res) => revisionsController.listAll(req, res));
adminRevisionRouter.get('/:id',                 (req, res) => revisionsController.getById(req, res));
adminRevisionRouter.put('/:id/status',          (req, res) => revisionsController.updateStatus(req, res));
adminRevisionRouter.post('/:id/approve',        (req, res) => revisionsController.approve(req, res));

// ── Client portal: /api/portal/projects/:id/revision-requests ────────────────
export const portalRevisionRouter = Router({ mergeParams: true });
portalRevisionRouter.use(requireClient as any);
portalRevisionRouter.post('/', (req, res) => revisionsController.createRequest(req as any, res));

// ── Client portal: /api/portal/revision-requests ─────────────────────────────
export const portalRevisionListRouter = Router();
portalRevisionListRouter.use(requireClient as any);
portalRevisionListRouter.get('/', (req, res) => revisionsController.listForClient(req as any, res));
