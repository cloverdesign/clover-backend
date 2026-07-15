import { Router } from 'express';
import { mediaController } from './media.controller';
import { requireAdmin } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(requireAdmin);

// POST /api/media/upload
router.post('/upload', upload.single('file'), (req, res) =>
  mediaController.upload(req, res)
);

// GET /api/media
router.get('/', (req, res) => mediaController.listMedia(req, res));

// DELETE /api/media/:id
router.delete('/:id', (req, res) => mediaController.deleteMedia(req, res));

export default router;
