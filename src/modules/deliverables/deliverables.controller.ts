import { Request, Response } from 'express';
import {
  deliverablesService,
  createDeliverableSchema,
  updateDeliverableSchema,
  reviewDeliverableSchema,
} from './deliverables.service';
import { ClientAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const notFound = (msg: string) =>
  msg === 'Deliverable not found' || msg === 'Project not found';

export const deliverablesController = {

  async listByProject(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await deliverablesService.listByProject(param(req.params.id)), 'Deliverables retrieved');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createDeliverableSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await deliverablesService.create(param(req.params.id), parsed.data), 'Deliverable created', 201);
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateDeliverableSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await deliverablesService.update(param(req.params.id), parsed.data), 'Deliverable updated');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await deliverablesService.delete(param(req.params.id));
      sendSuccess(res, null, 'Deliverable deleted');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  // Client portal
  async listForClient(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const deliverables = await deliverablesService.listForClient(
        param((req as Request).params.id),
        req.client!.clientId,
      );
      sendSuccess(res, deliverables, 'Deliverables retrieved');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async review(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = reviewDeliverableSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const review = await deliverablesService.review(
        param((req as Request).params.id),
        req.client!.clientId,
        parsed.data,
      );
      sendSuccess(res, review, 'Review submitted');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 409);
    }
  },
};
