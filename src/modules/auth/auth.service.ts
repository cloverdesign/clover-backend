import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { signAdminToken } from '../../middleware/auth';
import { mailer } from '../../lib/mailer';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name:     z.string().min(1, 'Name is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const verifyLoginOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp:   z.string().length(6, 'OTP must be 6 digits'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const safeAdminSelect = {
  id:            true,
  email:         true,
  name:          true,
  role:          true,
  emailVerified: true,
  approved:      true,
  createdAt:     true,
  updatedAt:     true,
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {

  /**
   * Step 1 of registration: create unverified, unapproved admin and send verification email.
   */
  async register(email: string, password: string, name: string) {
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) throw new Error('An admin with this email already exists');

    const hashed                 = await bcrypt.hash(password, 12);
    const verificationToken      = generateToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.admin.create({
      data: {
        email,
        password: hashed,
        name,
        role:          'ADMIN',
        emailVerified: false,
        approved:      false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    const verificationUrl = `${env.BASE_URL}/api/auth/verify-email?token=${verificationToken}`;
    await mailer.sendAdminVerificationEmail(email, name, verificationUrl);

    return { message: 'Account created. Please check your email to verify your account before you can be approved.' };
  },

  /**
   * Step 2 of registration: verify email token.
   * After verification, notifies super admin to approve the account.
   */
  async verifyEmail(token: string) {
    const admin = await prisma.admin.findFirst({
      where: {
        verificationToken:       token,
        verificationTokenExpiry: { gt: new Date() },
        emailVerified:           false,
      },
    });

    if (!admin) throw new Error('Invalid or expired verification link');

    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        emailVerified:           true,
        verificationToken:       null,
        verificationTokenExpiry: null,
      },
    });

    // Notify super admin that a new account awaits approval (fire-and-forget)
    mailer.sendAdminApprovalRequest(
      admin.name,
      admin.email,
      `${env.BASE_URL}/admin/admins`,
    ).catch(() => {});

    return { message: 'Email verified. Your account is pending approval by a super admin. You will be notified once approved.' };
  },

  /**
   * Step 1 of login: validate password, check verified + approved, send OTP.
   */
  async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new Error('Invalid email or password');

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) throw new Error('Invalid email or password');

    if (!admin.emailVerified) {
      throw new Error('Please verify your email address before signing in');
    }

    if (!admin.approved) {
      throw new Error('Your account is pending approval by a super admin');
    }

    const otp    = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.admin.update({
      where: { id: admin.id },
      data:  { loginOtp: otp, loginOtpExpiry: expiry },
    });

    try {
      await mailer.sendAdminLoginOtp(email, admin.name, otp);
    } catch {
      throw new Error('Failed to send verification code — please check your email configuration');
    }

    return { message: 'A verification code has been sent to your email' };
  },

  /**
   * Step 2 of login: validate OTP, return JWT with role embedded.
   */
  async verifyLoginOtp(email: string, otp: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });

    if (
      !admin ||
      admin.loginOtp !== otp ||
      !admin.loginOtpExpiry ||
      admin.loginOtpExpiry < new Date()
    ) {
      throw new Error('Invalid or expired code');
    }

    const updated = await prisma.admin.update({
      where:  { id: admin.id },
      data:   { loginOtp: null, loginOtpExpiry: null },
      select: safeAdminSelect,
    });

    const jwtToken = signAdminToken(admin.id, admin.role);
    return { token: jwtToken, admin: updated };
  },

  async getMe(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where:  { id: adminId },
      select: safeAdminSelect,
    });
    if (!admin) throw new Error('Admin not found');
    return admin;
  },
};
