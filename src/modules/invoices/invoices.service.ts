import { z } from 'zod';
import path from 'path';
import prisma from '../../lib/prisma';
import { env } from '../../config/env';
import { mailer } from '../../lib/mailer';
import { generateInvoicePdf, InvoiceLineItem } from '../../lib/pdfGenerator';

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  amount:      z.number().positive('Amount must be greater than 0'),
  currency:    z.string().length(3).optional(),
  description: z.string().optional(),
  lineItems:   z.array(z.object({
    description: z.string().min(1),
    quantity:    z.number().positive(),
    unitPrice:   z.number().positive(),
  })).optional().default([]),
  dueDate:     z.string().datetime('Invalid due date'),
  issuedDate:  z.string().datetime().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// ─── Auto invoice number ───────────────────────────────────────────────────────

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const num   = String(count + 1).padStart(4, '0');
  return `INV-${num}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const invoicesService = {

  async listByProject(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    return prisma.invoice.findMany({
      where:   { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(projectId: string, data: z.infer<typeof createInvoiceSchema>) {
    const project = await prisma.project.findUnique({
      where:   { id: projectId },
      include: { client: true },
    });
    if (!project) throw new Error('Project not found');

    const invoiceNumber = await nextInvoiceNumber();
    const currency      = data.currency ?? project.currency;

    return prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber,
        amount:      data.amount,
        currency,
        description: data.description,
        lineItems:   data.lineItems ?? [],
        dueDate:     new Date(data.dueDate),
        issuedDate:  data.issuedDate ? new Date(data.issuedDate) : new Date(),
      },
    });
  },

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where:   { id },
      include: { project: { include: { client: true } } },
    });
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  },

  async update(id: string, data: z.infer<typeof updateInvoiceSchema>) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'DRAFT') throw new Error('Only draft invoices can be edited');

    return prisma.invoice.update({
      where: { id },
      data:  {
        ...data,
        dueDate:    data.dueDate    ? new Date(data.dueDate)    : undefined,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
      },
    });
  },

  async delete(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Paid invoices cannot be deleted');
    await prisma.invoice.delete({ where: { id } });
  },

  async send(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where:   { id },
      include: { project: { include: { client: true } } },
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Invoice is already paid');

    const { project } = invoice;
    const { client }  = project;

    // Generate PDF
    const pdfUrl = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedDate:    invoice.issuedDate,
      dueDate:       invoice.dueDate,
      clientName:    client.name,
      clientEmail:   client.email,
      clientCompany: client.company,
      projectName:   project.name,
      amount:        invoice.amount,
      currency:      invoice.currency,
      description:   invoice.description,
      lineItems:     (invoice.lineItems as unknown as InvoiceLineItem[]) ?? [],
    });

    // Mark as sent
    const updated = await prisma.invoice.update({
      where: { id },
      data:  { status: 'SENT', pdfUrl },
    });

    // Email client with PDF attachment
    const pdfPath = path.join(process.cwd(), pdfUrl);
    await mailer.sendInvoiceNotification(
      client.email,
      client.name,
      invoice.invoiceNumber,
      invoice.amount,
      invoice.currency,
      invoice.dueDate,
      `${env.BASE_URL}/portal`,
      pdfPath,
    );

    return updated;
  },

  async markPaid(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Invoice is already marked as paid');

    return prisma.invoice.update({
      where: { id },
      data:  { status: 'PAID', paidDate: new Date() },
    });
  },

  async markOverdue(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Invoice is already paid');

    return prisma.invoice.update({
      where: { id },
      data:  { status: 'OVERDUE' },
    });
  },
};
