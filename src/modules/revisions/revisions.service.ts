import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';
import { notificationsService } from '../notifications/notifications.service';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createRevisionRequestSchema = z.object({
  description:     z.string().min(1, 'Description is required'),
  targetTimeframe: z.string().optional(),
  attachments:     z.array(z.object({
    url:  z.string().url(),
    name: z.string(),
  })).optional().default([]),
  deliverableId: z.string().optional(),
});

export const updateRevisionStatusSchema = z.object({
  status:       z.enum(['IN_REVIEW', 'APPROVED', 'DECLINED']),
  decisionNote: z.string().optional(),
});

export const approveRevisionSchema = z.object({
  type: z.enum(['new_project', 'new_phase']),
  // For new_project — basic project scaffold
  projectName:        z.string().optional(),
  projectDescription: z.string().optional(),
  // For new_phase — the admin authors the phase inline: label + its milestones
  phase:       z.string().optional(),
  milestones:  z.array(z.object({
    title:   z.string().min(1, 'Milestone title is required'),
    dueDate: z.string().datetime().optional(),
  })).optional(),
  endDate: z.string().datetime().optional(),
  // Terminal decision note, shown to the client (either approval path)
  decisionNote: z.string().optional(),
}).refine((d) => d.type !== 'new_phase' || !!d.phase?.trim(), {
  message: 'phase is required for new_phase approvals',
  path:    ['phase'],
}).refine((d) => d.type !== 'new_phase' || (d.milestones && d.milestones.length >= 1), {
  message: 'At least one milestone is required for new_phase approvals',
  path:    ['milestones'],
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const revisionsService = {

  // ── Admin ──────────────────────────────────────────────────────────────────

  async listAll() {
    return prisma.revisionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client:  { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
  },

  async getById(id: string) {
    const request = await prisma.revisionRequest.findUnique({
      where:   { id },
      include: {
        client:  { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, clientId: true } },
      },
    });
    if (!request) throw new Error('Revision request not found');
    return request;
  },

  async updateStatus(id: string, data: z.infer<typeof updateRevisionStatusSchema>) {
    const request = await prisma.revisionRequest.findUnique({
      where:   { id },
      include: {
        client:  true,
        project: true,
      },
    });
    if (!request) throw new Error('Revision request not found');

    const updated = await prisma.revisionRequest.update({
      where: { id },
      data:  {
        status:       data.status,
        decisionNote: data.decisionNote,
      },
    });

    // Notify client of status change
    if (data.status !== 'IN_REVIEW' || request.status === 'REQUESTED') {
      await mailer.sendRevisionRequestStatusUpdate(
        request.client.email,
        request.client.name,
        request.project.name,
        data.status,
        `${env.PORTAL_BASE_URL}/portal`,
        data.decisionNote ?? null,
      );
    }

    return updated;
  },

  async approve(id: string, data: z.infer<typeof approveRevisionSchema>) {
    const request = await prisma.revisionRequest.findUnique({
      where:   { id },
      include: { client: true, project: true },
    });
    if (!request) throw new Error('Revision request not found');
    if (request.status === 'APPROVED') throw new Error('Revision request is already approved');

    let resultingProjectId: string;

    if (data.type === 'new_project') {
      // Scaffold a new linked project
      const newProject = await prisma.project.create({
        data: {
          clientId:        request.clientId,
          parentProjectId: request.projectId,
          name:            data.projectName || `${request.project.name} — Revision`,
          description:     data.projectDescription || request.description,
          currency:        request.project.currency,
          status:          'PLANNING',
        },
      });
      resultingProjectId = newProject.id;
    } else {
      // new_phase — scaffold the phase's milestones on the parent project,
      // advance its phase label, and (optionally) extend its end date.
      resultingProjectId = request.projectId;

      const maxOrder = await prisma.milestone.aggregate({
        where:  { projectId: request.projectId },
        _max:   { order: true },
      });
      let nextOrder = (maxOrder._max.order ?? -1) + 1;

      await prisma.milestone.createMany({
        data: data.milestones!.map((milestone) => ({
          projectId: request.projectId,
          title:     milestone.title,
          dueDate:   milestone.dueDate ? new Date(milestone.dueDate) : undefined,
          phase:     data.phase,
          status:    'PENDING' as const,
          order:     nextOrder++,
        })),
      });

      const projectUpdateData: { phase: string; endDate?: Date } = { phase: data.phase! };
      if (data.endDate) {
        const newEndDate = new Date(data.endDate);
        if (!request.project.endDate || newEndDate > request.project.endDate) {
          projectUpdateData.endDate = newEndDate;
        }
      }
      await prisma.project.update({ where: { id: request.projectId }, data: projectUpdateData });
    }

    const updated = await prisma.revisionRequest.update({
      where: { id },
      data:  {
        status:             'APPROVED',
        resultingProjectId,
        decisionNote:       data.decisionNote,
      },
    });

    await mailer.sendRevisionRequestStatusUpdate(
      request.client.email,
      request.client.name,
      request.project.name,
      'APPROVED',
      `${env.PORTAL_BASE_URL}/portal`,
      data.decisionNote ?? null,
    );

    return updated;
  },

  // ── Client Portal ──────────────────────────────────────────────────────────

  async createRequest(
    projectId: string,
    clientId:  string,
    data:      z.infer<typeof createRevisionRequestSchema>,
  ) {
    const project = await prisma.project.findFirst({
      where:   { id: projectId, clientId },
      include: { client: true },
    });
    if (!project) throw new Error('Project not found');

    if (data.deliverableId) {
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: data.deliverableId, projectId },
      });
      if (!deliverable) throw new Error('Deliverable not found');
    }

    const request = await prisma.revisionRequest.create({
      data: {
        projectId,
        clientId,
        description:     data.description,
        targetTimeframe: data.targetTimeframe,
        attachments:     data.attachments ?? [],
        deliverableId:   data.deliverableId,
        status:          'REQUESTED',
      },
    });

    const portalUrl = `${env.PORTAL_BASE_URL}/portal`;

    // Acknowledge receipt to the client
    await mailer.sendRevisionRequestStatusUpdate(
      project.client.email,
      project.client.name,
      project.name,
      'REQUESTED',
      portalUrl,
    );

    // Notify admin (email + in-app)
    await mailer.sendRevisionRequestReceived(
      project.client.name,
      project.name,
      data.description,
    );
    await notificationsService.notifyApprovedAdmins({
      type:       'REVISION_REQUESTED',
      title:      'Revision requested',
      body:       `${project.client.name} · ${project.name}`,
      href:       `/admin/revision-requests/${request.id}`,
      entityType: 'revision',
      entityId:   request.id,
      sourceKey:  `revision-requested:${request.id}`,
    });

    return request;
  },

  async listForClient(clientId: string) {
    return prisma.revisionRequest.findMany({
      where:   { clientId },
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { id: true, name: true } } },
    });
  },
};
