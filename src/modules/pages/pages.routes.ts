import { Router } from 'express';
import { pagesController } from './pages.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Public route — must be before /:id to avoid conflict
// GET /api/pages/slug/:slug
router.get('/slug/:slug', (req, res) => pagesController.getPageBySlug(req, res));

// All routes below require admin auth
router.use(requireAdmin);

// GET    /api/pages
router.get('/', (req, res) => pagesController.listPages(req, res));

// POST   /api/pages
router.post('/', (req, res) => pagesController.createPage(req, res));

// GET    /api/pages/:id
router.get('/:id', (req, res) => pagesController.getPageById(req, res));

// PUT    /api/pages/:id
router.put('/:id', (req, res) => pagesController.updatePage(req, res));

// DELETE /api/pages/:id
router.delete('/:id', (req, res) => pagesController.deletePage(req, res));

// POST   /api/pages/:id/blocks
router.post('/:id/blocks', (req, res) => pagesController.addBlock(req, res));

// PUT    /api/pages/:id/blocks/reorder  — must be before /:id/blocks/:blockId
router.put('/:id/blocks/reorder', (req, res) =>
  pagesController.reorderBlocks(req, res)
);

// PUT    /api/pages/:id/blocks/:blockId
router.put('/:id/blocks/:blockId', (req, res) =>
  pagesController.updateBlock(req, res)
);

// DELETE /api/pages/:id/blocks/:blockId
router.delete('/:id/blocks/:blockId', (req, res) =>
  pagesController.deleteBlock(req, res)
);

export default router;
