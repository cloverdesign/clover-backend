import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createDeliverableSchema = z.object({
  title:        z.string().min(1, 'Title is required'),
  description:  z.string().optional(),
  fileUrl:      z.string().url().optional(),
  externalLink: z.string().url().optional(),
  milestoneId:  z.string().optional(),
}).refine((d) => d.fileUrl || d.externalLink, {
  message: 'Either fileUrl or externalLink is required',
});

export const updateDeliverableSchema = z.object({
  title:        z.string().min(1).optional(),
  description:  z.string().optional(),
  fileUrl:      z.string().url().optional(),
  externalLink: z.string().url().optional(),
  milestoneId:  z.string().nullable().optional(),
});

export const reviewDeliverableSchema = z.object({
  status:  z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  comment: z.string().optional(),
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const deliverablesService = {

  async listByProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    return prisma.deliverable.findMany({
      where:   { projectId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        milestone: { select: { id: true, title: true } },
        reviews:   { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  },

  async create(projectId: string, data: z.infer<typeof createDeliverableSchema>) {
    const project = await prisma.project.findUnique({
      where:   { id: projectId },
      include: { client: true },
    });
    if (!project) throw new Error('Project not found');

    // Find the latest version of a deliverable with the same title (for versioning)
    const latestVersion = await prisma.deliverable.findFirst({
      where:   { projectId, title: data.title },
      orderBy: { version: 'desc' },
    });

    const version = latestVersion ? latestVersion.version + 1 : 1;

    // Supersede all previous versions
    if (latestVersion) {
      await prisma.deliverable.updateMany({
        where: { projectId, title: data.title, status: 'READY' },
        data:  { status: 'SUPERSEDED' },
      });
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        projectId,
        title:        data.title,
        description:  data.description,
        fileUrl:      data.fileUrl,
        externalLink: data.externalLink,
        milestoneId:  data.milestoneId,
        version,
        status:       'READY',
      },
      include: {
        milestone: { select: { id: true, title: true } },
      },
    });

    // Notify client
    await mailer.sendDeliverableReady(
      project.client.email,
      project.client.name,
      data.title,
      project.name,
      `${env.BASE_URL}/portal`,
    );

    return deliverable;
  },

  async update(id: string, data: z.infer<typeof updateDeliverableSchema>) {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } });
    if (!deliverable) throw new Error('Deliverable not found');

    return prisma.deliverable.update({
      where: { id },
      data,
      include: { milestone: { select: { id: true, title: true } } },
    });
  },

  async delete(id: string) {
    const deliverable = await prisma.deliverable.findUnique({ where: { id } });
    if (!deliverable) throw new Error('Deliverable not found');
    await prisma.deliverable.delete({ where: { id } });
  },

  async review(deliverableId: string, clientId: string, data: z.infer<typeof reviewDeliverableSchema>) {
    const deliverable = await prisma.deliverable.findUnique({
      where:   { id: deliverableId },
      include: { project: { include: { client: true } } },
    });
    if (!deliverable) throw new Error('Deliverable not found');

    // Verify the deliverable belongs to the client's project
    if (deliverable.project.clientId !== clientId) throw new Error('Deliverable not found');
    if (deliverable.status !== 'READY') throw new Error('Only ready deliverables can be reviewed');

    const review = await prisma.deliverableReview.create({
      data: {
        deliverableId,
        status:    data.status,
        comment:   data.comment,
        reviewedAt: new Date(),
      },
    });

    // Notify admin
    await mailer.sendDeliverableReviewed(
      deliverable.project.client.name,
      deliverable.title,
      deliverable.project.name,
      data.status,
      data.comment ?? null,
    );

    return review;
  },

  // Client portal: list ready deliverables for a project
  async listForClient(projectId: string, clientId: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, clientId } });
    if (!project) throw new Error('Project not found');

    return prisma.deliverable.findMany({
      where:   { projectId, status: 'READY' },
      orderBy: { uploadedAt: 'desc' },
      include: {
        milestone: { select: { id: true, title: true } },
        reviews:   { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  },
};
