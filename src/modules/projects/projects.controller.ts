import { Request, Response } from 'express';
import {
  projectsService,
  createProjectSchema,
  updateProjectSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createUpdateSchema,
} from './projects.service';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]): string =>
  Array.isArray(v) ? v[0] : v;

export const projectsController = {
  async listProjects(_req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectsService.listProjects();
      sendSuccess(res, projects, 'Projects retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve projects');
    }
  },

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const project = await projectsService.createProject(parsed.data);
      sendSuccess(res, project, 'Project created', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to create project',
        err.message === 'Client not found' ? 404 : 500
      );
    }
  },

  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectsService.getProjectById(param(req.params.id));
      sendSuccess(res, project, 'Project retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve project',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const project = await projectsService.updateProject(param(req.params.id), parsed.data);
      sendSuccess(res, project, 'Project updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update project',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      await projectsService.deleteProject(param(req.params.id));
      sendSuccess(res, null, 'Project deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete project',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  // Milestones
  async addMilestone(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createMilestoneSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const milestone = await projectsService.addMilestone(
        param(req.params.id),
        parsed.data
      );
      sendSuccess(res, milestone, 'Milestone added', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to add milestone',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateMilestoneSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const milestone = await projectsService.updateMilestone(
        param(req.params.id),
        param(req.params.milestoneId),
        parsed.data
      );
      sendSuccess(res, milestone, 'Milestone updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update milestone',
        err.message === 'Milestone not found' ? 404 : 500
      );
    }
  },

  async deleteMilestone(req: Request, res: Response): Promise<void> {
    try {
      await projectsService.deleteMilestone(
        param(req.params.id),
        param(req.params.milestoneId)
      );
      sendSuccess(res, null, 'Milestone deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete milestone',
        err.message === 'Milestone not found' ? 404 : 500
      );
    }
  },

  // Project Updates
  async addUpdate(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const update = await projectsService.addUpdate(param(req.params.id), parsed.data);
      sendSuccess(res, update, 'Update posted', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to post update',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  async deleteUpdate(req: Request, res: Response): Promise<void> {
    try {
      await projectsService.deleteUpdate(
        param(req.params.id),
        param(req.params.updateId)
      );
      sendSuccess(res, null, 'Update deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete update',
        err.message === 'Project update not found' ? 404 : 500
      );
    }
  },
};
