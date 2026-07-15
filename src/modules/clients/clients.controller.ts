import { Request, Response } from 'express';
import {
  clientsService,
  createClientSchema,
  updateClientSchema,
  completeOnboardingSchema,
  portalLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './clients.service';
import { ClientAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]): string =>
  Array.isArray(v) ? v[0] : v;

export const clientsController = {
  // Admin: Clients CRUD
  async listClients(_req: Request, res: Response): Promise<void> {
    try {
      const clients = await clientsService.listClients();
      sendSuccess(res, clients, 'Clients retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve clients');
    }
  },

  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const client = await clientsService.createClient(parsed.data);
      sendSuccess(res, client, 'Client created', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to create client',
        err.message?.includes('already exists') ? 409 : 500
      );
    }
  },

  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      const client = await clientsService.getClientById(param(req.params.id));
      sendSuccess(res, client, 'Client retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve client',
        err.message === 'Client not found' ? 404 : 500
      );
    }
  },

  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateClientSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const client = await clientsService.updateClient(param(req.params.id), parsed.data);
      sendSuccess(res, client, 'Client updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update client',
        err.message === 'Client not found'
          ? 404
          : err.message?.includes('already exists')
          ? 409
          : 500
      );
    }
  },

  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      await clientsService.deleteClient(param(req.params.id));
      sendSuccess(res, null, 'Client deleted');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to delete client',
        err.message === 'Client not found' ? 404 : 500
      );
    }
  },

  async sendOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const result = await clientsService.sendOnboarding(param(req.params.id));
      sendSuccess(res, result, 'Onboarding invitation generated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to send onboarding',
        err.message === 'Client not found' ? 404 : 500
      );
    }
  },

  // Public: Onboarding
  async getOnboardingInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = await clientsService.getOnboardingInfo(param(req.params.token));
      sendSuccess(res, info, 'Onboarding info retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve onboarding info',
        err.message?.includes('Invalid') || err.message?.includes('expired')
          ? 400
          : 500
      );
    }
  },

  async completeOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const parsed = completeOnboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const result = await clientsService.completeOnboarding(
        param(req.params.token),
        parsed.data
      );
      sendSuccess(res, result, 'Onboarding completed successfully');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to complete onboarding',
        err.message?.includes('Invalid') || err.message?.includes('expired')
          ? 400
          : 500
      );
    }
  },

  // Portal (client auth)
  async portalLogin(req: Request, res: Response): Promise<void> {
    try {
      const parsed = portalLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const result = await clientsService.portalLogin(
        parsed.data.email,
        parsed.data.password
      );
      sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      sendError(res, err.message || 'Login failed', 401);
    }
  },

  async portalMe(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const client = await clientsService.getPortalMe(req.client!.clientId);
      sendSuccess(res, client, 'Profile retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve profile', 500);
    }
  },

  async portalProjects(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const projects = await clientsService.getPortalProjects(req.client!.clientId);
      sendSuccess(res, projects, 'Projects retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve projects', 500);
    }
  },

  async portalProjectById(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const project = await clientsService.getPortalProjectById(
        req.client!.clientId,
        param((req as Request).params.id)
      );
      sendSuccess(res, project, 'Project retrieved');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to retrieve project',
        err.message === 'Project not found' ? 404 : 500
      );
    }
  },

  async updateProfile(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const client = await clientsService.updateProfile(req.client!.clientId, parsed.data);
      sendSuccess(res, client, 'Profile updated');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to update profile',
        err.message?.includes('already exists') ? 409 : 500
      );
    }
  },

  async changePassword(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      await clientsService.changePassword(req.client!.clientId, parsed.data);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to change password',
        err.message === 'Current password is incorrect' ? 400 : 500
      );
    }
  },

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const result = await clientsService.forgotPassword(parsed.data.email);
      sendSuccess(res, result, result.message);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to process request', 500);
    }
  },

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      await clientsService.resetPassword(param(req.params.token), parsed.data.password);
      sendSuccess(res, null, 'Password reset successfully');
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Failed to reset password',
        err.message?.includes('Invalid') || err.message?.includes('expired') ? 400 : 500
      );
    }
  },
};
