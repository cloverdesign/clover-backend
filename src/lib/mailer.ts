import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { createLogger } from './logger';

const log = createLogger('mailer');

const transporter = nodemailer.createTransport({
  host:   'smtp.zoho.com',
  port:   587,
  secure: false, // STARTTLS
  auth: {
    user: env.ZOHO_EMAIL,
    pass: env.ZOHO_PASSWORD,
  },
});

const from = `"${env.ZOHO_FROM_NAME}" <${env.ZOHO_EMAIL}>`;

// ─── Helper ───────────────────────────────────────────────────────────────────

async function send(options: nodemailer.SendMailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({ from, ...options });
    log.info('Email sent', { messageId: info.messageId, to: options.to, subject: options.subject });
  } catch (err: any) {
    log.error('Failed to send email', { to: options.to, subject: options.subject, error: err.message });
    throw err;
  }
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #0f0f0f; padding: 28px 40px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151; }
    .body p:last-child { margin-bottom: 0; }
    .code-block { background: #f3f4f6; border-radius: 6px; padding: 16px 24px; margin: 24px 0; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f0f0f; }
    .btn { display: inline-block; margin: 24px 0; padding: 12px 28px; background: #0f0f0f; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .meta { font-size: 13px; color: #6b7280; }
    .footer { background: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>Clover Agency</h1></div>
    <div class="body">${body}</div>
    <div class="footer"><p>This email was sent by Clover Agency. Please do not reply directly to this message.</p></div>
  </div>
</body>
</html>`;
}

// ─── Email methods ────────────────────────────────────────────────────────────

export const mailer = {
  /**
   * OTP code sent to client for passwordless login.
   */
  async sendOtp(email: string, clientName: string, code: string): Promise<void> {
    await send({
      to:      email,
      subject: 'Your login code',
      html: layout('Your login code', `
        <p>Hi ${clientName},</p>
        <p>Use the code below to sign in to your client portal. It expires in <strong>10 minutes</strong>.</p>
        <div class="code-block">${code}</div>
        <p class="meta">If you did not request this code, you can safely ignore this email.</p>
      `),
    });
  },

  /**
   * Sent to client when their project is created and the portal is ready.
   */
  async sendProjectWelcome(
    email: string,
    clientName: string,
    projectName: string,
    portalUrl: string,
  ): Promise<void> {
    await send({
      to:      email,
      subject: `Your project is ready — ${projectName}`,
      html: layout('Your project is ready', `
        <p>Hi ${clientName},</p>
        <p>We have set up your project <strong>${projectName}</strong> on the Clover client portal. You can track progress, view milestones, and access deliverables and invoices from one place.</p>
        <a class="btn" href="${portalUrl}">View your project</a>
        <hr class="divider" />
        <p class="meta">Sign in using the email address this message was sent to. We will send you a one-time code each time you log in — no password needed.</p>
      `),
    });
  },

  /**
   * Sent to client when an invoice is marked as Sent.
   */
  async sendInvoiceNotification(
    email: string,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: Date,
    portalUrl: string,
    pdfAttachmentPath?: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    const formattedDue   = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const attachments: nodemailer.SendMailOptions['attachments'] = pdfAttachmentPath
      ? [{ filename: `Invoice-${invoiceNumber}.pdf`, path: pdfAttachmentPath }]
      : [];

    await send({
      to:          email,
      subject:     `Invoice ${invoiceNumber} — ${formattedAmount} due ${formattedDue}`,
      html: layout(`Invoice ${invoiceNumber}`, `
        <p>Hi ${clientName},</p>
        <p>Please find your invoice below.</p>
        <p><strong>Invoice number:</strong> ${invoiceNumber}<br />
        <strong>Amount due:</strong> ${formattedAmount}<br />
        <strong>Due date:</strong> ${formattedDue}</p>
        <a class="btn" href="${portalUrl}">View invoice in portal</a>
        <hr class="divider" />
        <p class="meta">If you have any questions about this invoice, please get in touch with your account manager.</p>
      `),
      attachments,
    });
  },

  /**
   * Sent to client when a deliverable is marked Ready.
   */
  async sendDeliverableReady(
    email: string,
    clientName: string,
    deliverableTitle: string,
    projectName: string,
    portalUrl: string,
  ): Promise<void> {
    await send({
      to:      email,
      subject: `New deliverable ready for review — ${deliverableTitle}`,
      html: layout('New deliverable ready', `
        <p>Hi ${clientName},</p>
        <p>A new deliverable is ready for your review on <strong>${projectName}</strong>.</p>
        <p><strong>${deliverableTitle}</strong></p>
        <a class="btn" href="${portalUrl}">Review deliverable</a>
        <hr class="divider" />
        <p class="meta">You can approve the deliverable or request changes directly from the portal.</p>
      `),
    });
  },

  /**
   * Sent to admin when a client reviews a deliverable.
   */
  async sendDeliverableReviewed(
    clientName: string,
    deliverableTitle: string,
    projectName: string,
    reviewStatus: 'APPROVED' | 'CHANGES_REQUESTED',
    comment: string | null,
  ): Promise<void> {
    const label  = reviewStatus === 'APPROVED' ? 'approved' : 'requested changes on';
    const subject = reviewStatus === 'APPROVED'
      ? `Deliverable approved — ${deliverableTitle}`
      : `Changes requested — ${deliverableTitle}`;

    await send({
      to:      env.ADMIN_EMAIL,
      subject,
      html: layout('Deliverable reviewed', `
        <p><strong>${clientName}</strong> has ${label} <strong>${deliverableTitle}</strong> on project <strong>${projectName}</strong>.</p>
        ${comment ? `<p><strong>Comment:</strong><br />${comment}</p>` : ''}
        <a class="btn" href="${env.BASE_URL}/admin/projects">View in admin panel</a>
      `),
    });
  },

  /**
   * Sent to admin when a client submits a revision request.
   */
  async sendRevisionRequestReceived(
    clientName: string,
    projectName: string,
    description: string,
  ): Promise<void> {
    await send({
      to:      env.ADMIN_EMAIL,
      subject: `New revision request from ${clientName} — ${projectName}`,
      html: layout('New revision request', `
        <p><strong>${clientName}</strong> has submitted a revision request for <strong>${projectName}</strong>.</p>
        <p><strong>Description:</strong><br />${description}</p>
        <a class="btn" href="${env.BASE_URL}/admin/revision-requests">View in admin panel</a>
      `),
    });
  },

  /**
   * Sent to client when admin updates the status of their revision request.
   */
  async sendRevisionRequestStatusUpdate(
    email: string,
    clientName: string,
    projectName: string,
    status: 'IN_REVIEW' | 'APPROVED' | 'DECLINED',
    portalUrl: string,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      IN_REVIEW: 'is being reviewed',
      APPROVED:  'has been approved',
      DECLINED:  'has been declined',
    };

    await send({
      to:      email,
      subject: `Revision request update — ${projectName}`,
      html: layout('Revision request update', `
        <p>Hi ${clientName},</p>
        <p>Your revision request for <strong>${projectName}</strong> ${statusLabels[status]}.</p>
        <a class="btn" href="${portalUrl}">View in portal</a>
      `),
    });
  },
};
