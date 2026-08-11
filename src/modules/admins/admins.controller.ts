import { Response } from 'express';
import { adminsService } from './admins.service';
import { AdminAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

export const adminsController = {

  async list(_req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const admins = await adminsService.listAll();
      sendSuccess(res, admins, 'Admins retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve admins', 500);
    }
  },

  async getById(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const admin = await adminsService.getById(req.params['id'] as string);
      sendSuccess(res, admin, 'Admin retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve admin', err.message === 'Admin not found' ? 404 : 500);
    }
  },

  async approve(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const admin = await adminsService.approve(req.params['id'] as string, req.admin!.adminId);
      sendSuccess(res, admin, 'Admin approved');
    } catch (err: any) {
      const status = err.message === 'Admin not found' ? 404 : err.message?.includes('already') ? 409 : 400;
      sendError(res, err.message || 'Failed to approve admin', status);
    }
  },

  async revoke(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const admin = await adminsService.revoke(req.params['id'] as string, req.admin!.adminId);
      sendSuccess(res, admin, 'Admin access revoked');
    } catch (err: any) {
      const status = err.message === 'Admin not found' ? 404 : 400;
      sendError(res, err.message || 'Failed to revoke admin', status);
    }
  },

  async changeRole(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const { role } = req.body;
      if (!role || !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        sendError(res, 'role must be SUPER_ADMIN or ADMIN', 400);
        return;
      }
      const admin = await adminsService.changeRole(req.params['id'] as string, role, req.admin!.adminId);
      sendSuccess(res, admin, 'Admin role updated');
    } catch (err: any) {
      const status = err.message === 'Admin not found' ? 404 : 400;
      sendError(res, err.message || 'Failed to update role', status);
    }
  },

  async remove(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      await adminsService.remove(req.params['id'] as string, req.admin!.adminId);
      sendSuccess(res, null, 'Admin deleted');
    } catch (err: any) {
      const status = err.message === 'Admin not found' ? 404 : 400;
      sendError(res, err.message || 'Failed to delete admin', status);
    }
  },
};
