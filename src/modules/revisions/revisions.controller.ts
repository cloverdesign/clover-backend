import { Request, Response } from 'express';
import {
  revisionsService,
  createRevisionRequestSchema,
  updateRevisionStatusSchema,
  approveRevisionSchema,
} from './revisions.service';
import { ClientAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

export const revisionsController = {

  // ── Admin ──────────────────────────────────────────────────────────────────

  async listAll(_req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await revisionsService.listAll(), 'Revision requests retrieved');
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await revisionsService.getById(param(req.params.id)), 'Revision request retrieved');
    } catch (err: any) {
      sendError(res, err.message, err.message === 'Revision request not found' ? 404 : 500);
    }
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateRevisionStatusSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await revisionsService.updateStatus(param(req.params.id), parsed.data), 'Status updated');
    } catch (err: any) {
      sendError(res, err.message, err.message === 'Revision request not found' ? 404 : 500);
    }
  },

  async approve(req: Request, res: Response): Promise<void> {
    try {
      const parsed = approveRevisionSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await revisionsService.approve(param(req.params.id), parsed.data), 'Revision approved');
    } catch (err: any) {
      sendError(res, err.message, err.message === 'Revision request not found' ? 404 : 409);
    }
  },

  // ── Client Portal ──────────────────────────────────────────────────────────

  async createRequest(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = createRevisionRequestSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const request = await revisionsService.createRequest(
        param((req as Request).params.id),
        req.client!.clientId,
        parsed.data,
      );
      sendSuccess(res, request, 'Revision request submitted', 201);
    } catch (err: any) {
      sendError(res, err.message, err.message === 'Project not found' ? 404 : 500);
    }
  },

  async listForClient(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, await revisionsService.listForClient(req.client!.clientId), 'Revision requests retrieved');
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  },
};
