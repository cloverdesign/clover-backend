import { z } from 'zod';
import prisma from '../../lib/prisma';

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
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'])
    .optional()
    .default('PENDING'),
  order: z.number().int().min(0),
  dueDate: z.string().datetime().optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const createUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  isVisible: z.boolean().optional().default(true),
});

export const projectsService = {
  async listProjects() {
    return prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
        _count: { select: { milestones: true, updates: true } },
      },
    });
  },

  async createProject(data: z.infer<typeof createProjectSchema>) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    });
    if (!client) throw new Error('Client not found');

    return prisma.project.create({
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
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
    });
  },

  async getProjectById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
        milestones:   { orderBy: { order: 'asc' } },
        updates:      { orderBy: { createdAt: 'desc' } },
        invoices:     { orderBy: { createdAt: 'desc' } },
        deliverables: { orderBy: { uploadedAt: 'desc' } },
        revisions:    { select: { id: true, name: true, status: true, createdAt: true } },
      },
    });

    if (!project) throw new Error('Project not found');
    return project;
  },

  async updateProject(id: string, data: z.infer<typeof updateProjectSchema>) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error('Project not found');

    return prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, company: true },
        },
        milestones: { orderBy: { order: 'asc' } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
    });
  },

  async deleteProject(id: string) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) throw new Error('Project not found');
    await prisma.project.delete({ where: { id } });
  },

  // Milestones
  async addMilestone(projectId: string, data: z.infer<typeof createMilestoneSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    return prisma.milestone.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        order: data.order,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  },

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    data: z.infer<typeof updateMilestoneSchema>
  ) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) throw new Error('Milestone not found');

    const updateData: any = { ...data };

    // If marking as completed and completedAt not already set
    if (data.status === 'COMPLETED' && !milestone.completedAt) {
      updateData.completedAt = new Date();
    }
    // If reverting from completed
    if (data.status && data.status !== 'COMPLETED') {
      updateData.completedAt = null;
    }

    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    return prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
    });
  },

  async deleteMilestone(projectId: string, milestoneId: string) {
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) throw new Error('Milestone not found');
    await prisma.milestone.delete({ where: { id: milestoneId } });
  },

  // Project Updates
  async addUpdate(projectId: string, data: z.infer<typeof createUpdateSchema>) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    return prisma.projectUpdate.create({
      data: {
        projectId,
        title: data.title,
        content: data.content,
        isVisible: data.isVisible ?? true,
      },
    });
  },

  async deleteUpdate(projectId: string, updateId: string) {
    const update = await prisma.projectUpdate.findFirst({
      where: { id: updateId, projectId },
    });
    if (!update) throw new Error('Project update not found');
    await prisma.projectUpdate.delete({ where: { id: updateId } });
  },
};
