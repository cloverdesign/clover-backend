import { Request, Response } from 'express';
import { authService, loginSchema, registerSchema } from './auth.service';
import { AdminAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password);
      sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      sendError(res, err.message || 'Login failed', 401);
    }
  },

  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, parsed.error.errors[0].message, 400);
        return;
      }

      const { email, password, name } = parsed.data;
      const result = await authService.register(email, password, name);
      sendSuccess(res, result, 'Admin registered successfully', 201);
    } catch (err: any) {
      sendError(
        res,
        err.message || 'Registration failed',
        err.message?.includes('already exists') ? 409 : 500
      );
    }
  },

  async getMe(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin!.adminId;
      const admin = await authService.getMe(adminId);
      sendSuccess(res, admin, 'Profile retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve profile', 500);
    }
  },
};
