import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// POST /api/auth/register — create account, sends verification email
router.post('/register', (req, res) => authController.register(req, res));

// GET  /api/auth/verify-email?token=... — verify email after registration
// POST /api/auth/verify-email { token } — same, for programmatic clients
router.get('/verify-email',  (req, res) => authController.verifyEmail(req, res));
router.post('/verify-email', (req, res) => authController.verifyEmail(req, res));

// POST /api/auth/login — validate password, sends OTP
router.post('/login', (req, res) => authController.login(req, res));

// POST /api/auth/verify-otp — validate OTP, returns JWT
router.post('/verify-otp', (req, res) => authController.verifyLoginOtp(req, res));

// GET  /api/auth/me — requires valid JWT
router.get('/me', requireAdmin, (req, res) => authController.getMe(req as any, res));

export default router;
