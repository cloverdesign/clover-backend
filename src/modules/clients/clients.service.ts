import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { signClientToken } from '../../middleware/auth';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  status: z
    .enum(['LEAD', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED'])
    .optional()
    .default('LEAD'),
});

export const updateClientSchema = createClientSchema.partial();

export const completeOnboardingSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export const portalLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const clientsService = {
  async listClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { projects: true } },
      },
    });
  },

  async createClient(data: z.infer<typeof createClientSchema>) {
    const existing = await prisma.client.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new Error('A client with this email already exists');

    return prisma.client.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { milestones: true, updates: true } },
          },
        },
      },
    });

    if (!client) throw new Error('Client not found');
    return client;
  },

  async updateClient(id: string, data: z.infer<typeof updateClientSchema>) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('Client not found');

    if (data.email && data.email !== client.email) {
      const existing = await prisma.client.findUnique({
        where: { email: data.email },
      });
      if (existing) throw new Error('A client with this email already exists');
    }

    return prisma.client.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        notes: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async deleteClient(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('Client not found');
    await prisma.client.delete({ where: { id } });
  },

  async sendOnboarding(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('Client not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.client.update({
      where: { id },
      data: {
        onboardingToken: token,
        onboardingExpiresAt: expiresAt,
        status: 'ONBOARDING',
      },
    });

    const onboardingUrl = `${env.BASE_URL}/onboarding/${token}`;
    return { onboardingUrl, token, expiresAt };
  },

  // Onboarding (public)
  async getOnboardingInfo(token: string) {
    const client = await prisma.client.findUnique({
      where: { onboardingToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        onboardingExpiresAt: true,
        onboardingCompletedAt: true,
      },
    });

    if (!client) throw new Error('Invalid onboarding link');
    if (client.onboardingCompletedAt) {
      throw new Error('Onboarding has already been completed');
    }
    if (client.onboardingExpiresAt && client.onboardingExpiresAt < new Date()) {
      throw new Error('Onboarding link has expired');
    }

    return client;
  },

  async completeOnboarding(
    token: string,
    data: z.infer<typeof completeOnboardingSchema>
  ) {
    const client = await prisma.client.findUnique({
      where: { onboardingToken: token },
    });

    if (!client) throw new Error('Invalid onboarding link');
    if (client.onboardingCompletedAt) {
      throw new Error('Onboarding has already been completed');
    }
    if (client.onboardingExpiresAt && client.onboardingExpiresAt < new Date()) {
      throw new Error('Onboarding link has expired');
    }

    const hashed = await bcrypt.hash(data.password, 12);

    const updated = await prisma.client.update({
      where: { id: client.id },
      data: {
        password: hashed,
        phone: data.phone ?? client.phone,
        company: data.company ?? client.company,
        onboardingToken: null,
        onboardingExpiresAt: null,
        onboardingCompletedAt: new Date(),
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        createdAt: true,
      },
    });

    const jwtToken = signClientToken(updated.id);
    return { token: jwtToken, client: updated };
  },

  // Portal
  async portalLogin(email: string, password: string) {
    const client = await prisma.client.findUnique({ where: { email } });
    if (!client || !client.password) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) throw new Error('Invalid email or password');

    const token = signClientToken(client.id);
    const { password: _pw, onboardingToken: _ot, ...safeClient } = client;

    return { token, client: safeClient };
  },

  async getPortalMe(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!client) throw new Error('Client not found');
    return client;
  },

  async getPortalProjects(clientId: string) {
    return prisma.project.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        updates: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  async getPortalProjectById(clientId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, clientId },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        updates: {
          where: { isVisible: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) throw new Error('Project not found');
    return project;
  },

  async updateProfile(clientId: string, data: z.infer<typeof updateProfileSchema>) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error('Client not found');

    if (data.email && data.email !== client.email) {
      const existing = await prisma.client.findUnique({ where: { email: data.email } });
      if (existing) throw new Error('A client with this email already exists');
    }

    return prisma.client.update({
      where: { id: clientId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async changePassword(
    clientId: string,
    data: z.infer<typeof changePasswordSchema>
  ) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || !client.password) throw new Error('Client not found');

    const isValid = await bcrypt.compare(data.currentPassword, client.password);
    if (!isValid) throw new Error('Current password is incorrect');

    if (data.currentPassword === data.newPassword) {
      throw new Error('New password must be different from the current password');
    }

    const hashed = await bcrypt.hash(data.newPassword, 12);
    await prisma.client.update({
      where: { id: clientId },
      data: { password: hashed },
    });
  },

  async forgotPassword(email: string) {
    const client = await prisma.client.findUnique({ where: { email } });
    // Always respond the same way to avoid email enumeration
    if (!client || !client.onboardingCompletedAt) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.client.update({
      where: { id: client.id },
      data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
    });

    const resetUrl = `${env.BASE_URL}/portal/reset-password/${token}`;
    // In production: send resetUrl via email
    return { message: 'If that email exists, a reset link has been sent', resetUrl, token };
  },

  async resetPassword(token: string, newPassword: string) {
    const client = await prisma.client.findUnique({
      where: { passwordResetToken: token },
    });

    if (!client) throw new Error('Invalid or expired reset token');
    if (!client.passwordResetExpiresAt || client.passwordResetExpiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.client.update({
      where: { id: client.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
  },
};
