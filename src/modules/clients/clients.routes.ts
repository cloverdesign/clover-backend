import { Router } from 'express';
import { clientsController } from './clients.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.use(requireAdmin);

// GET    /api/clients
router.get('/', (req, res) => clientsController.listClients(req, res));

// POST   /api/clients
router.post('/', (req, res) => clientsController.createClient(req, res));

// GET    /api/clients/:id
router.get('/:id', (req, res) => clientsController.getClientById(req, res));

// PUT    /api/clients/:id
router.put('/:id', (req, res) => clientsController.updateClient(req, res));

// DELETE /api/clients/:id
router.delete('/:id', (req, res) => clientsController.deleteClient(req, res));

// POST   /api/clients/:id/send-onboarding
router.post('/:id/send-onboarding', (req, res) =>
  clientsController.sendOnboarding(req, res)
);

export default router;
