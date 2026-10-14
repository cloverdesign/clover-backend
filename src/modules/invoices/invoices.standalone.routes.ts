import { Router } from 'express';
import { invoicesController } from './invoices.controller';
import { requireAdmin } from '../../middleware/auth';

// Standalone routes for /api/invoices/:id operations
const router = Router();

router.use(requireAdmin);

router.get('/:id',               (req, res) => invoicesController.getById(req, res));
router.put('/:id',               (req, res) => invoicesController.update(req, res));
router.delete('/:id',            (req, res) => invoicesController.delete(req, res));
router.post('/:id/send',         (req, res) => invoicesController.send(req, res));
router.post('/:id/mark-paid',    (req, res) => invoicesController.markPaid(req, res));
router.post('/:id/mark-overdue', (req, res) => invoicesController.markOverdue(req, res));
router.get('/:id/pdf/preview',   (req, res) => invoicesController.previewPdf(req, res));
router.get('/:id/pdf/download',  (req, res) => invoicesController.downloadPdf(req, res));

export default router;
