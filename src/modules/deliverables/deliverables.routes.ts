import { Router } from 'express';
import { deliverablesController } from './deliverables.controller';
import { requireAdmin, requireClient } from '../../middleware/auth';

// ── Admin routes: /api/projects/:id/deliverables ──────────────────────────────
export const adminDeliverableRouter = Router({ mergeParams: true });
adminDeliverableRouter.use(requireAdmin);
adminDeliverableRouter.get('/',    (req, res) => deliverablesController.listByProject(req, res));
adminDeliverableRouter.post('/',   (req, res) => deliverablesController.create(req, res));

// ── Admin standalone: /api/deliverables/:id ───────────────────────────────────
export const adminDeliverableStandaloneRouter = Router();
adminDeliverableStandaloneRouter.use(requireAdmin);
adminDeliverableStandaloneRouter.put('/:id',    (req, res) => deliverablesController.update(req, res));
adminDeliverableStandaloneRouter.delete('/:id', (req, res) => deliverablesController.delete(req, res));

// ── Client portal: /api/portal/projects/:id/deliverables ─────────────────────
export const portalDeliverableRouter = Router({ mergeParams: true });
portalDeliverableRouter.use(requireClient as any);
portalDeliverableRouter.get('/', (req, res) => deliverablesController.listForClient(req as any, res));

// ── Client portal: /api/portal/deliverables/:id/review ───────────────────────
export const portalDeliverableReviewRouter = Router();
portalDeliverableReviewRouter.use(requireClient as any);
portalDeliverableReviewRouter.post('/:id/review', (req, res) => deliverablesController.review(req as any, res));
