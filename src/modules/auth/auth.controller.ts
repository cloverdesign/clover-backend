import { Request, Response } from 'express';
import {
  authService,
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  verifyLoginOtpSchema,
} from './auth.service';
import { AdminAuthRequest } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';

export const authController = {

  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const { email, password, name } = parsed.data;
      const result = await authService.register(email, password, name);
      sendSuccess(res, result, result.message, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Registration failed', err.message?.includes('already exists') ? 409 : 500);
    }
  },

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const token = (req.query.token as string) || req.body?.token;
      const parsed = verifyEmailSchema.safeParse({ token });
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const result = await authService.verifyEmail(parsed.data.token);
      sendSuccess(res, result, 'Email verified. You are now signed in.');
    } catch (err: any) {
      sendError(res, err.message || 'Verification failed', 400);
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password);
      sendSuccess(res, result, result.message);
    } catch (err: any) {
      sendError(res, err.message || 'Login failed', 401);
    }
  },

  async verifyLoginOtp(req: Request, res: Response): Promise<void> {
    try {
      const parsed = verifyLoginOtpSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      const { email, otp } = parsed.data;
      const result = await authService.verifyLoginOtp(email, otp);
      sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      sendError(res, err.message || 'OTP verification failed', 401);
    }
  },

  async getMe(req: AdminAuthRequest, res: Response): Promise<void> {
    try {
      const admin = await authService.getMe(req.admin!.adminId);
      sendSuccess(res, admin, 'Profile retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve profile', 500);
    }
  },
};
