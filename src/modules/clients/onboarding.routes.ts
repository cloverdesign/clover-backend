import { Router } from 'express';
import { clientsController } from './clients.controller';

const router = Router();

// GET  /api/onboarding/:token
router.get('/:token', (req, res) =>
  clientsController.getOnboardingInfo(req, res)
);

// POST /api/onboarding/:token/complete
router.post('/:token/complete', (req, res) =>
  clientsController.completeOnboarding(req, res)
);

export default router;
