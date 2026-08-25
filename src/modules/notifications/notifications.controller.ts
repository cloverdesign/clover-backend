import { Response } from 'express';
import { notificationsService, markReadSchema } from './notifications.service';
import { AdminAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

export const notificationsController = {

  async list(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const notifications = await notificationsService.listForAdmin(req.admin!.adminId);
      sendSuccess(res, notifications, 'Notifications retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve notifications', 500);
    }
  },

  async markRead(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const parsed = markReadSchema.safeParse(req.body ?? {});
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const notification = await notificationsService.markRead(
        req.admin!.adminId,
        param(req.params.id),
        parsed.data.read,
      );
      sendSuccess(res, notification, 'Notification updated');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to update notification', err.message === 'Notification not found' ? 404 : 500);
    }
  },

  async markAllRead(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const result = await notificationsService.markAllRead(req.admin!.adminId);
      sendSuccess(res, result, `${result.updated} notification${result.updated === 1 ? '' : 's'} marked read`);
    } catch (err: any) {
      sendError(res, err.message || 'Failed to mark notifications read', 500);
    }
  },
};
