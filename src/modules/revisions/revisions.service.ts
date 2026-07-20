import { z } from 'zod';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createRevisionRequestSchema = z.object({
  description:     z.string().min(1, 'Description is required'),
  targetTimeframe: z.string().optional(),
  attachments:     z.array(z.object({
    url:  z.string().url(),
    name: z.string(),
  })).optional().default([]),
});

export const updateRevisionStatusSchema = z.object({
  status:            z.enum(['IN_REVIEW', 'APPROVED', 'DECLINED']),
  resultingPhaseNote: z.string().optional(),
});

export const approveRevisionSchema = z.object({
  type:              z.enum(['new_project', 'new_phase']),
  // For new_project — basic project scaffold
  projectName:       z.string().optional(),
  projectDescription: z.string().optional(),
  // For new_phase — note added to existing project
  phaseNote:         z.string().optional(),
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
        status:            data.status,
        resultingPhaseNote: data.resultingPhaseNote,
      },
    });

    // Notify client of status change
    if (data.status !== 'IN_REVIEW' || request.status === 'REQUESTED') {
      await mailer.sendRevisionRequestStatusUpdate(
        request.client.email,
        request.client.name,
        request.project.name,
        data.status,
        `${env.BASE_URL}/portal`,
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

    let resultingProjectId: string | undefined;

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
    }

    const updated = await prisma.revisionRequest.update({
      where: { id },
      data:  {
        status:             'APPROVED',
        resultingProjectId: resultingProjectId ?? undefined,
        resultingPhaseNote: data.type === 'new_phase' ? data.phaseNote : undefined,
      },
    });

    await mailer.sendRevisionRequestStatusUpdate(
      request.client.email,
      request.client.name,
      request.project.name,
      'APPROVED',
      `${env.BASE_URL}/portal`,
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

    const request = await prisma.revisionRequest.create({
      data: {
        projectId,
        clientId,
        description:     data.description,
        targetTimeframe: data.targetTimeframe,
        attachments:     data.attachments ?? [],
        status:          'REQUESTED',
      },
    });

    // Notify admin
    await mailer.sendRevisionRequestReceived(
      project.client.name,
      project.name,
      data.description,
    );

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
