import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';
import type { AdminRole } from '../../middleware/auth';

export const createProjectSchema = z.object({
  clientId:       z.string().min(1, 'Client ID is required'),
  name:           z.string().min(1, 'Project name is required'),
  type:           z.string().optional(),
  description:    z.string().optional(),
  phase:          z.string().optional(),
  status:         z.enum(['PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional().default('PLANNING'),
  progress:       z.number().int().min(0).max(100).optional().default(0),
  currency:       z.string().length(3).optional().default('USD'),
  totalValue:     z.number().positive().optional(),
  budget:         z.number().positive().optional(),
  startDate:      z.string().datetime().optional(),
  endDate:        z.string().datetime().optional(),
  archived:       z.boolean().optional().default(false),
  notes:          z.string().optional(),
  parentProjectId: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().omit({ clientId: true });

export const createMilestoneSchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status:      z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional().default('PENDING'),
  order:       z.number().int().min(0),
  dueDate:     z.string().datetime().optional(),
  phase:       z.string().optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const createUpdateSchema = z.object({
  title:     z.string().min(1, 'Title is required'),
  content:   z.string().min(1, 'Content is required'),
  isVisible: z.boolean().optional().default(true),
});

export const assignAdminSchema = z.object({
  adminId: z.string().min(1, 'adminId is required'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function portalProjectUrl(projectId: string) {
  return `${env.PORTAL_BASE_URL}/portal/projects/${projectId}`;
}

const adminSummarySelect = { id: true, name: true, email: true, role: true } as const;

// Assignments are fetched as a raw join-row array; flatten to the admins
// themselves and drop the join rows from the response shape.
function withAssignedAdmins<T extends { assignments: { admin: unknown }[] }>(
  project: T,
): Omit<T, 'assignments'> & { assignedAdmins: unknown[] } {
  const { assignments, ...rest } = project;
  return { ...rest, assignedAdmins: assignments.map((a) => a.admin) };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const projectsService = {

  // Non-super-admins only see projects they're assigned to — this is what
  // scopes the admin dashboard. Super admins always see everything.
  async listProjects(admin: { adminId: string; role: AdminRole }) {
    const projects = await prisma.project.findMany({
      where:   admin.role === 'SUPER_ADMIN' ? undefined : { assignments: { some: { adminId: admin.adminId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        client:      { select: { id: true, name: true, email: true, company: true } },
        _count:      { select: { milestones: true, updates: true } },
        assignments: { include: { admin: { select: adminSummarySelect } } },
      },
    });
    return projects.map(withAssignedAdmins);
  },

  async createProject(data: z.infer<typeof createProjectSchema>) {
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new Error('Client not found');

    const project = await prisma.project.create({
      data: {
        clientId:        data.clientId,
        name:            data.name,
        type:            data.type,
        description:     data.description,
        phase:           data.phase,
        status:          data.status,
        progress:        data.progress,
        currency:        data.currency ?? 'USD',
        totalValue:      data.totalValue,
        budget:          data.budget,
        startDate:       data.startDate ? new Date(data.startDate) : undefined,
        endDate:         data.endDate ? new Date(data.endDate) : undefined,
        archived:        data.archived ?? false,
        notes:           data.notes,
        parentProjectId: data.parentProjectId,
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
      },
    });

    // Notify client that their project is ready
    mailer.sendProjectWelcome(
      client.email,
      client.name,
      project.name,
      portalProjectUrl(project.id),
    ).catch(() => {});

    return project;
  },

  async getProjectById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client:       { select: { id: true, name: true, email: true, company: true } },
        milestones:   { orderBy: { order: 'asc' } },
        updates:      { orderBy: { createdAt: 'desc' } },
        invoices:     { orderBy: { createdAt: 'desc' } },
        deliverables: { orderBy: { uploadedAt: 'desc' } },
        revisions:    { select: { id: true, name: true, status: true, createdAt: true } },
        assignments:  { include: { admin: { select: adminSummarySelect } } },
      },
    });
    if (!project) throw new Error('Project not found');
    return withAssignedAdmins(project);
  },

  async updateProject(id: string, data: z.infer<typeof updateProjectSchema>) {
    const existing = await prisma.project.findUnique({
      where:   { id },
      include: { client: { select: { email: true, name: true } } },
    });
    if (!existing) throw new Error('Project not found');

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        client:     { select: { id: true, name: true, email: true, company: true } },
        milestones: { orderBy: { order: 'asc' } },
        updates:    { orderBy: { createdAt: 'desc' } },
      },
    });

    // Notify client if status changed
    if (data.status && data.status !== existing.status) {
      mailer.sendProjectStatusUpdate(
        existing.client.email,
        existing.client.name,
        existing.name,
        data.status,
        portalProjectUrl(id),
      ).catch(() => {});
    }

    return updated;
  },

  async deleteProject(id: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error('Project not found');
    await prisma.project.delete({ where: { id } });
  },

  // ── Milestones ───────────────────────────────────────────────────────────────

  async addMilestone(projectId: string, data: z.infer<typeof createMilestoneSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    return prisma.milestone.create({
      data: {
        projectId,
        title:       data.title,
        description: data.description,
        status:      data.status,
        order:       data.order,
        dueDate:     data.dueDate ? new Date(data.dueDate) : undefined,
        phase:        data.phase,
      },
    });
  },

  async listMilestones(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    return prisma.milestone.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
  },

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    data: z.infer<typeof updateMilestoneSchema>,
  ) {
    const milestone = await prisma.milestone.findFirst({
      where:   { id: milestoneId, projectId },
      include: {
        project: { include: { client: { select: { email: true, name: true } } } },
      },
    });
    if (!milestone) throw new Error('Milestone not found');

    const updateData: any = { ...data };

    if (data.status === 'COMPLETED' && !milestone.completedAt) {
      updateData.completedAt = new Date();
    }
    if (data.status && data.status !== 'COMPLETED') {
      updateData.completedAt = null;
    }
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const updated = await prisma.milestone.update({ where: { id: milestoneId }, data: updateData });

    // Notify client when milestone is completed
    if (data.status === 'COMPLETED' && milestone.status !== 'COMPLETED') {
      mailer.sendMilestoneCompleted(
        milestone.project.client.email,
        milestone.project.client.name,
        milestone.title,
        milestone.project.name,
        portalProjectUrl(projectId),
      ).catch(() => {});
    }

    return updated;
  },

  async deleteMilestone(projectId: string, milestoneId: string) {
    const milestone = await prisma.milestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) throw new Error('Milestone not found');
    await prisma.milestone.delete({ where: { id: milestoneId } });
  },

  // ── Project Updates ──────────────────────────────────────────────────────────

  async addUpdate(projectId: string, data: z.infer<typeof createUpdateSchema>) {
    const project = await prisma.project.findUnique({
      where:   { id: projectId },
      include: { client: { select: { email: true, name: true } } },
    });
    if (!project) throw new Error('Project not found');

    const update = await prisma.projectUpdate.create({
      data: {
        projectId,
        title:     data.title,
        content:   data.content,
        isVisible: data.isVisible ?? true,
      },
    });

    // Notify client for visible updates
    if (update.isVisible) {
      mailer.sendProjectUpdatePosted(
        project.client.email,
        project.client.name,
        update.title,
        project.name,
        portalProjectUrl(projectId),
      ).catch(() => {});
    }

    return update;
  },

  async listUpdates(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    return prisma.projectUpdate.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  },

  async deleteUpdate(projectId: string, updateId: string) {
    const update = await prisma.projectUpdate.findFirst({ where: { id: updateId, projectId } });
    if (!update) throw new Error('Project update not found');
    await prisma.projectUpdate.delete({ where: { id: updateId } });
  },

  // ── Assignments ──────────────────────────────────────────────────────────────

  async listAssignedAdmins(projectId: string) {
    const assignments = await prisma.projectAssignment.findMany({
      where:   { projectId },
      include: { admin: { select: adminSummarySelect } },
      orderBy: { createdAt: 'asc' },
    });
    return assignments.map((a) => a.admin);
  },

  async assignAdmin(projectId: string, adminId: string) {
    const [project, admin] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.admin.findUnique({ where: { id: adminId } }),
    ]);
    if (!project) throw new Error('Project not found');
    if (!admin) throw new Error('Admin not found');

    try {
      await prisma.projectAssignment.create({ data: { projectId, adminId } });
    } catch (err: any) {
      if (err.code === 'P2002') throw new Error('Admin is already assigned to this project');
      throw err;
    }

    return this.listAssignedAdmins(projectId);
  },

  async unassignAdmin(projectId: string, adminId: string) {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { projectId_adminId: { projectId, adminId } },
    });
    if (!assignment) throw new Error('Admin is not assigned to this project');

    await prisma.projectAssignment.delete({ where: { id: assignment.id } });
    return this.listAssignedAdmins(projectId);
  },
};
