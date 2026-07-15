import { Router } from 'express';
import { projectsController } from './projects.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

router.use(requireAdmin);

// GET    /api/projects
router.get('/', (req, res) => projectsController.listProjects(req, res));

// POST   /api/projects
router.post('/', (req, res) => projectsController.createProject(req, res));

// GET    /api/projects/:id
router.get('/:id', (req, res) => projectsController.getProjectById(req, res));

// PUT    /api/projects/:id
router.put('/:id', (req, res) => projectsController.updateProject(req, res));

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => projectsController.deleteProject(req, res));

// POST   /api/projects/:id/milestones
router.post('/:id/milestones', (req, res) =>
  projectsController.addMilestone(req, res)
);

// PUT    /api/projects/:id/milestones/:milestoneId
router.put('/:id/milestones/:milestoneId', (req, res) =>
  projectsController.updateMilestone(req, res)
);

// DELETE /api/projects/:id/milestones/:milestoneId
router.delete('/:id/milestones/:milestoneId', (req, res) =>
  projectsController.deleteMilestone(req, res)
);

// POST   /api/projects/:id/updates
router.post('/:id/updates', (req, res) => projectsController.addUpdate(req, res));

// DELETE /api/projects/:id/updates/:updateId
router.delete('/:id/updates/:updateId', (req, res) =>
  projectsController.deleteUpdate(req, res)
);

export default router;
