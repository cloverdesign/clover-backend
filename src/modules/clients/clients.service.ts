import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';
import { createClientSession } from '../../middleware/auth';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Invalid email address'),
  phone:   z.string().optional(),
  company: z.string().optional(),
  notes:   z.string().optional(),
  status:  z.enum(['LEAD', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'CHURNED']).optional().default('LEAD'),
});

export const updateClientSchema = createClientSchema.partial();

export const requestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code:  z.string().length(6, 'Code must be 6 digits'),
});

export const updateProfileSchema = z.object({
  name:    z.string().min(1).optional(),
  phone:   z.string().optional(),
  company: z.string().optional(),
  email:   z.string().email().optional(),
});

// ─── Safe client select (never expose sensitive fields) ───────────────────────

const safeClientSelect = {
  id:        true,
  name:      true,
  email:     true,
  phone:     true,
  company:   true,
  status:    true,
  notes:     true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export const clientsService = {

  // ── Admin: Client CRUD ──────────────────────────────────────────────────────

  async listClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        ...safeClientSelect,
        _count: { select: { projects: true } },
      },
    });
  },

  async createClient(data: z.infer<typeof createClientSchema>) {
    const existing = await prisma.client.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('A client with this email already exists');

    return prisma.client.create({ data, select: safeClientSelect });
  },

  async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where:  { id },
      select: {
        ...safeClientSelect,
        projects: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { milestones: true, updates: true } } },
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
      const existing = await prisma.client.findUnique({ where: { email: data.email } });
      if (existing) throw new Error('A client with this email already exists');
    }

    return prisma.client.update({ where: { id }, data, select: safeClientSelect });
  },

  async deleteClient(id: string) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('Client not found');
    await prisma.client.delete({ where: { id } });
  },

  // ── Passwordless Auth ───────────────────────────────────────────────────────

  async requestOtp(email: string) {
    const client = await prisma.client.findUnique({ where: { email } });

    // Always respond the same way — don't expose whether the email exists
    if (!client) {
      return { message: 'If that email is registered, a code has been sent' };
    }

    // Invalidate any existing unused codes for this email
    await prisma.otpCode.updateMany({
      where: { clientEmail: email, used: false },
      data:  { used: true },
    });

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({ data: { clientEmail: email, code, expiresAt } });

    await mailer.sendOtp(email, client.name, code);

    return { message: 'If that email is registered, a code has been sent' };
  },

  async verifyOtp(email: string, code: string) {
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        clientEmail: email,
        code,
        used:        false,
        expiresAt:   { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new Error('Invalid or expired code');

    // Mark OTP used
    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    const client = await prisma.client.findUnique({
      where:  { email },
      select: { ...safeClientSelect, status: true },
    });
    if (!client) throw new Error('Client not found');

    // Activate client on first login if still in LEAD/ONBOARDING
    if (client.status === 'LEAD' || client.status === 'ONBOARDING') {
      await prisma.client.update({ where: { email }, data: { status: 'ACTIVE' } });
    }

    const sessionToken = await createClientSession(client.id);
    return { token: sessionToken, client };
  },

  async logout(sessionId: string) {
    await prisma.authSession.delete({ where: { id: sessionId } });
  },

  // ── Portal: Profile ─────────────────────────────────────────────────────────

  async getPortalMe(clientId: string) {
    const client = await prisma.client.findUnique({
      where:  { id: clientId },
      select: safeClientSelect,
    });
    if (!client) throw new Error('Client not found');
    return client;
  },

  async updateProfile(clientId: string, data: z.infer<typeof updateProfileSchema>) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error('Client not found');

    if (data.email && data.email !== client.email) {
      const existing = await prisma.client.findUnique({ where: { email: data.email } });
      if (existing) throw new Error('A client with this email already exists');
    }

    return prisma.client.update({ where: { id: clientId }, data, select: safeClientSelect });
  },

  // ── Portal: Projects ────────────────────────────────────────────────────────

  async getPortalProjects(clientId: string) {
    return prisma.project.findMany({
      where:   { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        updates:    { where: { isVisible: true }, orderBy: { createdAt: 'desc' } },
        invoices:   { where: { status: { not: 'DRAFT' } }, orderBy: { createdAt: 'desc' } },
        _count:     { select: { deliverables: true } },
      },
    });
  },

  async getPortalProjectById(clientId: string, projectId: string) {
    const project = await prisma.project.findFirst({
      where:   { id: projectId, clientId },
      include: {
        milestones:   { orderBy: { order: 'asc' } },
        updates:      { where: { isVisible: true }, orderBy: { createdAt: 'desc' } },
        invoices:     { where: { status: { not: 'DRAFT' } }, orderBy: { issuedDate: 'desc' } },
        deliverables: {
          where:   { status: 'READY' },
          include: { reviews: { orderBy: { createdAt: 'desc' }, take: 1 } },
          orderBy: { uploadedAt: 'desc' },
        },
        revisionRequests: {
          where:   { clientId },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!project) throw new Error('Project not found');
    return project;
  },

  // ── Admin: invite client to portal ─────────────────────────────────────────

  async sendPortalInvite(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new Error('Client not found');

    const portalUrl = `${env.BASE_URL}/portal`;

    await mailer.sendOtp(client.email, client.name, '——');
    // We send the portal URL welcome email — the client will request an OTP from the portal
    await prisma.client.update({
      where: { id: clientId },
      data:  { status: 'ACTIVE' },
    });

    return { portalUrl };
  },
};
