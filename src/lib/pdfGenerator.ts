import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface InvoiceLineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issuedDate:    Date;
  dueDate:       Date;
  clientName:    string;
  clientEmail:   string;
  clientCompany: string | null;
  projectName:   string;
  amount:        number;
  currency:      string;
  description:   string | null;
  lineItems:     InvoiceLineItem[];
}

// On Lambda (and similar read-only environments) process.cwd() points to
// /var/task which is read-only. Only /tmp is writable at runtime.
const isReadOnlyFs =
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  process.cwd().startsWith('/var/task');

const INVOICES_DIR = isReadOnlyFs
  ? '/tmp/uploads/invoices'
  : path.join(process.cwd(), 'uploads', 'invoices');

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  black:      '#0f0f0f',
  darkGray:   '#374151',
  midGray:    '#6b7280',
  lightGray:  '#e5e7eb',
  veryLight:  '#f9fafb',
  white:      '#ffffff',
  accent:     '#0f0f0f',
};

export async function generateInvoicePdf(data: InvoicePdfData): Promise<string> {
  return new Promise((resolve, reject) => {
    // Ensure directory exists at generation time, not at module load time
    if (!fs.existsSync(INVOICES_DIR)) {
      fs.mkdirSync(INVOICES_DIR, { recursive: true });
    }

    const filename = `invoice-${data.invoiceNumber}.pdf`;
    const filePath = path.join(INVOICES_DIR, filename);
    const publicUrl = `/uploads/invoices/${filename}`;

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const pageWidth  = doc.page.width;
    const pageHeight = doc.page.height;
    const margin     = 50;
    const contentW   = pageWidth - margin * 2;

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 80).fill(C.black);
    doc.fontSize(22).fillColor(C.white).font('Helvetica-Bold')
      .text(env.ZOHO_FROM_NAME, margin, 28);
    doc.fontSize(10).font('Helvetica').fillColor('#aaaaaa')
      .text('INVOICE', pageWidth - margin - 80, 33, { width: 80, align: 'right' });

    // ── Invoice meta block ────────────────────────────────────────────────────
    let y = 104;

    doc.fontSize(11).fillColor(C.midGray).font('Helvetica').text('Invoice number', margin, y);
    doc.fontSize(11).fillColor(C.black).font('Helvetica-Bold').text(data.invoiceNumber, margin + 120, y);
    y += 20;

    doc.fontSize(11).fillColor(C.midGray).font('Helvetica').text('Issued', margin, y);
    doc.fontSize(11).fillColor(C.darkGray).font('Helvetica').text(formatDate(data.issuedDate), margin + 120, y);
    y += 20;

    doc.fontSize(11).fillColor(C.midGray).font('Helvetica').text('Due', margin, y);
    doc.fontSize(11).fillColor(C.darkGray).font('Helvetica').text(formatDate(data.dueDate), margin + 120, y);
    y += 36;

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(C.lightGray).lineWidth(1).stroke();
    y += 24;

    // ── Billed to / Project ───────────────────────────────────────────────────
    const col2X = margin + contentW / 2;

    doc.fontSize(9).fillColor(C.midGray).font('Helvetica').text('BILLED TO', margin, y);
    doc.fontSize(9).fillColor(C.midGray).font('Helvetica').text('PROJECT', col2X, y);
    y += 16;

    doc.fontSize(12).fillColor(C.black).font('Helvetica-Bold').text(data.clientName, margin, y);
    doc.fontSize(12).fillColor(C.black).font('Helvetica-Bold').text(data.projectName, col2X, y);
    y += 18;

    if (data.clientCompany) {
      doc.fontSize(11).fillColor(C.darkGray).font('Helvetica').text(data.clientCompany, margin, y);
      y += 16;
    }
    doc.fontSize(11).fillColor(C.darkGray).font('Helvetica').text(data.clientEmail, margin, y);
    y += 36;

    // ── Line items table ──────────────────────────────────────────────────────
    // Table header
    doc.rect(margin, y, contentW, 28).fill(C.veryLight);
    doc.fontSize(10).fillColor(C.midGray).font('Helvetica');
    doc.text('Description',                  margin + 10,        y + 9);
    doc.text('Qty',     margin + contentW * 0.6, y + 9, { width: 50,  align: 'right' });
    doc.text('Unit price', margin + contentW * 0.7, y + 9, { width: 80, align: 'right' });
    doc.text('Amount',  margin + contentW * 0.85, y + 9, { width: contentW * 0.15 - 10, align: 'right' });
    y += 28;

    // Table rows
    const items: InvoiceLineItem[] = data.lineItems.length > 0
      ? data.lineItems
      : [{ description: data.description || data.projectName, quantity: 1, unitPrice: data.amount }];

    let subtotal = 0;
    items.forEach((item, i) => {
      const rowTotal = item.quantity * item.unitPrice;
      subtotal += rowTotal;

      if (i % 2 === 1) doc.rect(margin, y, contentW, 26).fill('#fafafa');

      doc.fontSize(11).fillColor(C.darkGray).font('Helvetica');
      doc.text(item.description,              margin + 10,           y + 7, { width: contentW * 0.55 });
      doc.text(String(item.quantity),         margin + contentW * 0.6,  y + 7, { width: 50,  align: 'right' });
      doc.text(formatCurrency(item.unitPrice, data.currency), margin + contentW * 0.7, y + 7, { width: 80, align: 'right' });
      doc.text(formatCurrency(rowTotal, data.currency),       margin + contentW * 0.85, y + 7, { width: contentW * 0.15 - 10, align: 'right' });
      y += 26;
    });

    // Bottom border of table
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(C.lightGray).lineWidth(1).stroke();
    y += 20;

    // ── Total ─────────────────────────────────────────────────────────────────
    const totalW = 220;
    const totalX = pageWidth - margin - totalW;

    doc.fontSize(11).fillColor(C.midGray).font('Helvetica')
      .text('Subtotal', totalX, y, { width: totalW * 0.55 });
    doc.text(formatCurrency(subtotal, data.currency), totalX + totalW * 0.55, y, { width: totalW * 0.45, align: 'right' });
    y += 20;

    doc.moveTo(totalX, y).lineTo(pageWidth - margin, y).strokeColor(C.lightGray).lineWidth(1).stroke();
    y += 12;

    doc.fontSize(14).fillColor(C.black).font('Helvetica-Bold')
      .text('Total due', totalX, y, { width: totalW * 0.55 });
    doc.text(formatCurrency(data.amount, data.currency), totalX + totalW * 0.55, y, { width: totalW * 0.45, align: 'right' });
    y += 48;

    // ── Footer note ───────────────────────────────────────────────────────────
    doc.fontSize(10).fillColor(C.midGray).font('Helvetica')
      .text(`Thank you for your business. Please make payment by ${formatDate(data.dueDate)}.`, margin, y, { width: contentW });

    // ── Page footer ───────────────────────────────────────────────────────────
    doc.fontSize(9).fillColor(C.lightGray)
      .text(env.ZOHO_FROM_NAME, margin, pageHeight - 40, { width: contentW, align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(publicUrl));
    stream.on('error', reject);
  });
}
