import { z } from 'zod';
import prisma from '../../lib/prisma';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const markReadSchema = z.object({
  read: z.boolean().optional().default(true),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationInput = {
  type:       string;
  title:      string;
  body?:      string | null;
  href?:      string | null;
  entityType?: string | null;
  entityId?:  string | null;
  sourceKey:  string;
};

const MILESTONE_DUE_WINDOW_DAYS = 3;
const LIST_LIMIT = 50;

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const notificationsService = {

  // Fan out a domain event to the admins who'd care: super admins (who see
  // every project) plus whoever is assigned to this one. Idempotent via the
  // (adminId, sourceKey) unique constraint — safe to call more than once for
  // the same event.
  async notifyForProject(projectId: string, input: NotificationInput): Promise<void> {
    const admins = await prisma.admin.findMany({
      where: {
        approved: true,
        OR: [
          { role: 'SUPER_ADMIN' },
          { projectAssignments: { some: { projectId } } },
        ],
      },
      select: { id: true },
    });
    if (!admins.length) return;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({ adminId: admin.id, ...input })),
      skipDuplicates: true,
    });
  },

  // Derive time-based notifications (overdue invoices, milestones coming due)
  // for one admin, lazily, on read — there is no background scheduler.
  // Scoped to the admin's assigned projects; super admins see everything.
  async reconcile(adminId: string): Promise<void> {
    const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!admin) return;

    let projectId: { in: string[] } | undefined;
    if (admin.role !== 'SUPER_ADMIN') {
      const assignments = await prisma.projectAssignment.findMany({ where: { adminId }, select: { projectId: true } });
      if (!assignments.length) return; // not assigned to anything — nothing to reconcile
      projectId = { in: assignments.map((a) => a.projectId) };
    }

    const now  = new Date();
    const soon = new Date(now.getTime() + MILESTONE_DUE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [overdueInvoices, dueMilestones] = await Promise.all([
      prisma.invoice.findMany({
        where:   { status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lt: now }, ...(projectId && { projectId }) },
        include: { project: { include: { client: true } } },
      }),
      prisma.milestone.findMany({
        where:   { status: { not: 'COMPLETED' }, dueDate: { lte: soon, not: null }, ...(projectId && { projectId }) },
        include: { project: true },
      }),
    ]);

    const rows = [
      ...overdueInvoices.map((invoice) => {
        const daysLate = Math.max(1, Math.floor((now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)));
        const who      = invoice.project.client.company || invoice.project.client.name;
        return {
          adminId,
          type:       'INVOICE_OVERDUE',
          title:      'Invoice overdue',
          body:       `${who} · ${formatCurrency(invoice.amount, invoice.currency)} · ${daysLate} day${daysLate === 1 ? '' : 's'} late`,
          href:       `/admin/invoices/${invoice.id}`,
          entityType: 'invoice',
          entityId:   invoice.id,
          sourceKey:  `invoice-overdue:${invoice.id}`,
        };
      }),
      ...dueMilestones.map((milestone) => {
        const overdue = milestone.dueDate! < now;
        return {
          adminId,
          type:       'MILESTONE_DUE',
          title:      overdue ? 'Milestone overdue' : 'Milestone due soon',
          body:       `${milestone.project.name} · ${milestone.title}`,
          href:       `/admin/projects/${milestone.projectId}`,
          entityType: 'milestone',
          entityId:   milestone.id,
          sourceKey:  `milestone-due:${milestone.id}`,
        };
      }),
    ];

    if (rows.length) {
      await prisma.notification.createMany({ data: rows, skipDuplicates: true });
    }
  },

  async listForAdmin(adminId: string) {
    await this.reconcile(adminId);

    return prisma.notification.findMany({
      where:   { adminId },
      orderBy: { createdAt: 'desc' },
      take:    LIST_LIMIT,
    });
  },

  async markRead(adminId: string, id: string, read: boolean) {
    const existing = await prisma.notification.findFirst({ where: { id, adminId } });
    if (!existing) throw new Error('Notification not found');

    return prisma.notification.update({ where: { id }, data: { read } });
  },

  async markAllRead(adminId: string) {
    const result = await prisma.notification.updateMany({
      where: { adminId, read: false },
      data:  { read: true },
    });
    return { updated: result.count };
  },
};
