import { Router } from 'express';
import { clientsController } from './clients.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.use(requireAdmin);

router.get('/',                        (req, res) => clientsController.listClients(req, res));
router.post('/',                       (req, res) => clientsController.createClient(req, res));
router.get('/:id',                     (req, res) => clientsController.getClientById(req, res));
router.put('/:id',                     (req, res) => clientsController.updateClient(req, res));
router.delete('/:id',                  (req, res) => clientsController.deleteClient(req, res));
router.post('/:id/send-portal-invite', (req, res) => clientsController.sendPortalInvite(req, res));

export default router;
