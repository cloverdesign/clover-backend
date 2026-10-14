import { Request, Response } from 'express';
import { invoicesService, createInvoiceSchema, updateInvoiceSchema } from './invoices.service';
import { sendSuccess, sendError } from '../../utils/response';
import { ClientAuthRequest } from '../../middleware/auth';

const param = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const notFound    = (msg: string) => msg === 'Invoice not found' || msg === 'Project not found';
const conflict    = (msg: string) => msg.includes('already') || msg.includes('Only draft') || msg.includes('already paid') || msg.includes('already marked');

export const invoicesController = {

  async listByProject(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await invoicesService.listByProject(param(req.params.id)), 'Invoices retrieved');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async listForClient(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const invoices = await invoicesService.listForClient(
        param(req.params.id),
        req.client!.clientId,
      );
      sendSuccess(res, invoices, 'Invoices retrieved');
    } catch (err: any) {
      sendError(res, err.message, err.message === 'Project not found' ? 404 : 500);
    }
  },

  async listAllForClient(req: ClientAuthRequest, res: Response): Promise<void> {
    try {
      const invoices = await invoicesService.listAllForClient(req.client!.clientId);
      sendSuccess(res, invoices, 'Invoices retrieved');
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await invoicesService.create(param(req.params.id), parsed.data), 'Invoice created', 201);
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await invoicesService.getById(param(req.params.id)), 'Invoice retrieved');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateInvoiceSchema.safeParse(req.body);
      if (!parsed.success) { sendError(res, parsed.error.errors[0].message, 400); return; }

      sendSuccess(res, await invoicesService.update(param(req.params.id), parsed.data), 'Invoice updated');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : conflict(err.message) ? 409 : 500);
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await invoicesService.delete(param(req.params.id));
      sendSuccess(res, null, 'Invoice deleted');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : conflict(err.message) ? 409 : 500);
    }
  },

  async send(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await invoicesService.send(param(req.params.id)), 'Invoice sent');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : conflict(err.message) ? 409 : 500);
    }
  },

  async markPaid(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await invoicesService.markPaid(param(req.params.id)), 'Invoice marked as paid');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : conflict(err.message) ? 409 : 500);
    }
  },

  async markOverdue(req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, await invoicesService.markOverdue(param(req.params.id)), 'Invoice marked as overdue');
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : conflict(err.message) ? 409 : 500);
    }
  },

  async previewPdf(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, invoiceNumber } = await invoicesService.getPdfPath(param(req.params.id));
      res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoiceNumber}.pdf"`);
      res.sendFile(filePath);
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },

  async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { filePath, invoiceNumber } = await invoicesService.getPdfPath(param(req.params.id));
      res.download(filePath, `Invoice-${invoiceNumber}.pdf`);
    } catch (err: any) {
      sendError(res, err.message, notFound(err.message) ? 404 : 500);
    }
  },
};
