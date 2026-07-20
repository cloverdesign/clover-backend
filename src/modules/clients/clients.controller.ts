import { Request, Response } from 'express';
import {
  clientsService,
  createClientSchema,
  updateClientSchema,
  requestOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
} from './clients.service';
import { ClientAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

export const clientsController = {

  // ── Admin: Clients CRUD ────────────────────────────────────────────────────

  async listClients(_req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await clientsService.listClients(), 'Clients retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve clients');
    }
  },

  async createClient(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await clientsService.createClient(parsed.data), 'Client created', 201);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to create client', err.message?.includes('already exists') ? 409 : 500);
    }
  },

  async getClientById(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await clientsService.getClientById(param(req.params.id)), 'Client retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve client', err.message === 'Client not found' ? 404 : 500);
    }
  },

  async updateClient(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateClientSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await clientsService.updateClient(param(req.params.id), parsed.data), 'Client updated');
    } catch (err: any) {
      const status = err.message === 'Client not found' ? 404 : err.message?.includes('already exists') ? 409 : 500;
      sendError(res, err.message || 'Failed to update client', status);
    }
  },

  async deleteClient(req: Request, res: Response): Promise<void> {
    try {
      await clientsService.deleteClient(param(req.params.id));
      sendSuccess(res, null, 'Client deleted');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to delete client', err.message === 'Client not found' ? 404 : 500);
    }
  },

  async sendPortalInvite(req: Request, res: Response): Promise<void> {
    try {
      const result = await clientsService.sendPortalInvite(param(req.params.id));
      sendSuccess(res, result, 'Portal invite sent');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to send invite', err.message === 'Client not found' ? 404 : 500);
    }
  },

  // ── Passwordless Auth ──────────────────────────────────────────────────────

  async requestOtp(req: Request, res: Response): Promise<void> {
    try {
      const parsed = requestOtpSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const result = await clientsService.requestOtp(parsed.data.email);
      sendSuccess(res, result, result.message);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to send code', 500);
    }
  },

  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const result = await clientsService.verifyOtp(parsed.data.email, parsed.data.code);
      sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      sendError(res, err.message || 'Verification failed', 401);
    }
  },

  async logout(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      await clientsService.logout(req.session!.id);
      sendSuccess(res, null, 'Logged out');
    } catch (err: any) {
      sendError(res, err.message || 'Logout failed', 500);
    }
  },

  // ── Portal: Profile ────────────────────────────────────────────────────────

  async portalMe(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, await clientsService.getPortalMe(req.client!.clientId), 'Profile retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve profile', 500);
    }
  },

  async updateProfile(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await clientsService.updateProfile(req.client!.clientId, parsed.data), 'Profile updated');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to update profile', err.message?.includes('already exists') ? 409 : 500);
    }
  },

  // ── Portal: Projects ───────────────────────────────────────────────────────

  async portalProjects(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, await clientsService.getPortalProjects(req.client!.clientId), 'Projects retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve projects', 500);
    }
  },

  async portalProjectById(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const project = await clientsService.getPortalProjectById(req.client!.clientId, param((req as Request).params.id));
      sendSuccess(res, project, 'Project retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve project', err.message === 'Project not found' ? 404 : 500);
    }
  },
};
