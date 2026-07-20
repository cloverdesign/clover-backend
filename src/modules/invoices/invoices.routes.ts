import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router({ mergeParams: true }); // inherits :id from parent router

router.use(requireAdmin);

// GET    /api/projects/:id/invoices
router.get('/',                  (req, res) => invoicesController.listByProject(req, res));

// POST   /api/projects/:id/invoices
router.post('/',                 (req, res) => invoicesController.create(req, res));

// GET    /api/invoices/:id  (standalone — mounted separately)
// PUT    /api/invoices/:id
// DELETE /api/invoices/:id
// POST   /api/invoices/:id/send
// POST   /api/invoices/:id/mark-paid
// POST   /api/invoices/:id/mark-overdue

export default router;
