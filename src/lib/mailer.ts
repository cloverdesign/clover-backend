import sgMail from '@sendgrid/mail';
import fs from 'fs';
import { env } from '../config/env';
import { createLogger } from './logger';

const log = createLogger('mailer');

sgMail.setApiKey(env.SENDGRID_API_KEY);

const FROM = { name: env.SENDGRID_FROM_NAME, email: env.SENDGRID_FROM_EMAIL };

// ─── Send helper ──────────────────────────────────────────────────────────────

async function send(msg: sgMail.MailDataRequired): Promise<void> {
  try {
    await sgMail.send(msg);
    log.info('Email sent', { to: msg.to, subject: msg.subject });
  } catch (err: any) {
    log.error('Failed to send email', { to: msg.to, subject: msg.subject, error: err.message });
    throw err;
  }
}

// ─── Base template ────────────────────────────────────────────────────────────
// Table-based layout with fully inlined styles — required for consistent
// rendering across Gmail, Outlook, Apple Mail, and all mobile clients.
// Colors: #0f0f0f (black) + #2E7D52 (clover green)

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;";

// Reusable inline-style helpers so body templates stay readable
export const t = {
  h(text: string) {
    return `<p style="margin:0 0 14px;font-size:21px;font-weight:700;color:#0f0f0f;letter-spacing:-0.4px;line-height:1.3;${FONT}">${text}</p>`;
  },
  p(text: string) {
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4b5563;${FONT}">${text}</p>`;
  },
  note(text: string) {
    return `<p style="margin:0;font-size:13px;line-height:1.65;color:#9ca3af;${FONT}">${text}</p>`;
  },
  rule() {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr><td style="border-top:1px solid #f0f0f0;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
  },
  btn(label: string, url: string) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;"><tr><td style="border-radius:4px;background:#2E7D52;"><a href="${url}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:4px;letter-spacing:0.1px;${FONT}">${label}</a></td></tr></table>`;
  },
  tag(label: string, variant: 'green' | 'neutral' | 'warn' | 'decline' = 'green') {
    const colors: Record<string, string> = {
      green:   'background:#eaf4ee;color:#2E7D52;',
      neutral: 'background:#f3f4f6;color:#6b7280;',
      warn:    'background:#fef3e2;color:#c17a0c;',
      decline: 'background:#fef0f0;color:#d13939;',
    };
    return `<span style="display:inline-block;${colors[variant]}font-size:12px;font-weight:600;padding:3px 10px;border-radius:100px;margin-bottom:18px;letter-spacing:0.2px;${FONT}">${label}</span>`;
  },
  otp(code: string) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td style="background:#f8f8f8;border:1px solid #ebebeb;border-radius:6px;padding:28px 20px;text-align:center;">
            <div style="font-size:38px;font-weight:800;letter-spacing:14px;color:#0f0f0f;font-variant-numeric:tabular-nums;${FONT}">${code}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:10px;text-transform:uppercase;letter-spacing:0.8px;${FONT}">Expires in 10 minutes</div>
          </td>
        </tr>
      </table>`;
  },
  metaTable(rows: Array<{ label: string; value: string }>) {
    const rowsHtml = rows.map((r, i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:${i < rows.length - 1 ? '1px solid #f5f5f5' : 'none'};font-size:13px;color:#9ca3af;${FONT}">${r.label}</td>
        <td style="padding:10px 0;border-bottom:${i < rows.length - 1 ? '1px solid #f5f5f5' : 'none'};font-size:13px;color:#0f0f0f;font-weight:500;text-align:right;${FONT}">${r.value}</td>
      </tr>`).join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;background:#f8f8f8;border-radius:6px;">
        <tr><td style="padding:4px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
        </td></tr>
      </table>`;
  },
  quote(text: string) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
        <tr><td style="background:#f8f8f8;border-radius:6px;padding:16px 20px;font-size:15px;line-height:1.7;color:#374151;${FONT}">${text}</td></tr>
      </table>`;
  },
};

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Email</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; background-color: #f2f2f2; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    /* Mobile overrides */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .fluid { width: 100% !important; max-width: 100% !important; }
      .hd-cell, .bd-cell, .ft-cell { padding-left: 24px !important; padding-right: 24px !important; }
      .btn-td, .btn-a { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f2f2f2;width:100%;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f2f2;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <!-- Email container -->
        <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td class="hd-cell" style="background:#0f0f0f;padding:22px 36px;">
              <span style="font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;${FONT}">
                ${env.SENDGRID_FROM_NAME}<span style="display:inline-block;width:6px;height:6px;background:#2E7D52;border-radius:50%;margin-left:4px;vertical-align:middle;position:relative;top:-1px;"></span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="bd-cell" style="padding:36px 36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="ft-cell" style="padding:20px 36px;border-top:1px solid #eeeeee;">
              <p style="margin:0;font-size:12px;color:#c4c4c4;line-height:1.6;${FONT}">
                This email was sent by ${env.SENDGRID_FROM_NAME}. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Email methods ────────────────────────────────────────────────────────────

export const mailer = {

  // ── Admin: Registration email verification ──────────────────────────────────

  async sendAdminVerificationEmail(email: string, name: string, verificationUrl: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: 'Verify your admin account',
      html: layout(
        t.h('Verify your email') +
        t.p(`Hi ${name}, welcome to the ${env.SENDGRID_FROM_NAME} admin panel. Click the button below to verify your email address and activate your account.`) +
        t.btn('Verify email address', verificationUrl) +
        t.rule() +
        t.note('This link expires in 24 hours. If you did not create an admin account, you can safely ignore this email.')
      ),
    });
  },

  // ── Super admin: new admin awaiting approval ────────────────────────────────

  async sendAdminApprovalRequest(newAdminName: string, newAdminEmail: string, approvalUrl: string): Promise<void> {
    await send({
      to: env.ADMIN_EMAIL, from: FROM,
      subject: `New admin account awaiting approval — ${newAdminName}`,
      html: layout(
        t.h('New admin account') +
        t.p(`<strong style="color:#0f0f0f;font-weight:600;">${newAdminName}</strong> (${newAdminEmail}) has registered and verified their email. Their account is awaiting your approval before they can sign in.`) +
        t.btn('Review in admin panel', approvalUrl) +
        t.rule() +
        t.note('If you do not recognise this person, you can ignore this email. They will not be able to access the admin panel until approved.')
      ),
    });
  },

  // ── Admin: account approved notification ────────────────────────────────────

  async sendAdminAccountApproved(email: string, name: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: 'Your admin account has been approved',
      html: layout(
        t.h('Account approved') +
        t.tag('Approved', 'green') +
        t.p(`Hi ${name}, your admin account has been approved. You can now sign in to the admin panel.`) +
        t.rule() +
        t.note('Sign in with your email and password. You will receive a one-time code to complete the sign-in.')
      ),
    });
  },

  // ── Admin: Login OTP ────────────────────────────────────────────────────────

  async sendAdminLoginOtp(email: string, name: string, code: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `${code} is your sign-in code`,
      html: layout(
        t.h('Admin sign-in') +
        t.p(`Hi ${name}, use the code below to complete your sign-in.`) +
        t.otp(code) +
        t.note('If you did not attempt to sign in, your account may be at risk. Please change your password immediately.')
      ),
    });
  },

  // ── Client: Passwordless login OTP ─────────────────────────────────────────

  async sendOtp(email: string, clientName: string, code: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `${code} is your sign-in code`,
      html: layout(
        t.h('Your sign-in code') +
        t.p(`Hi ${clientName}, use the code below to access your client portal.`) +
        t.otp(code) +
        t.note('If you did not request this code, you can safely ignore this email.')
      ),
    });
  },

  // ── Client: Portal invite ───────────────────────────────────────────────────

  async sendPortalInvite(email: string, clientName: string, portalUrl: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `You have been invited to the ${env.SENDGRID_FROM_NAME} client portal`,
      html: layout(
        t.h('Welcome to your portal') +
        t.p(`Hi ${clientName}, your client portal is ready. You can track your project progress, view deliverables, review invoices, and stay up to date — all in one place.`) +
        t.btn('Access your portal', portalUrl) +
        t.rule() +
        t.note('Sign in using this email address. We will send you a one-time code each time you log in — no password needed.')
      ),
    });
  },

  // ── Client: Project welcome ─────────────────────────────────────────────────

  async sendProjectWelcome(email: string, clientName: string, projectName: string, portalUrl: string): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `Your project is live — ${projectName}`,
      html: layout(
        t.h('Your project is set up') +
        t.p(`Hi ${clientName}, we have set up <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> on your client portal. You can track progress, view milestones, access deliverables, and review invoices from one place.`) +
        t.btn('View your project', portalUrl) +
        t.rule() +
        t.note('Sign in with this email address. We will send you a one-time code — no password needed.')
      ),
    });
  },

  // ── Client: Project status changed ─────────────────────────────────────────

  async sendProjectStatusUpdate(
    email: string,
    clientName: string,
    projectName: string,
    newStatus: string,
    portalUrl: string,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      PLANNING:    'Planning',
      IN_PROGRESS: 'In Progress',
      REVIEW:      'Under Review',
      COMPLETED:   'Completed',
      ON_HOLD:     'On Hold',
      CANCELLED:   'Cancelled',
    };
    const label   = statusLabels[newStatus] ?? newStatus;
    const variant = newStatus === 'COMPLETED' ? 'green'
      : (newStatus === 'ON_HOLD' || newStatus === 'CANCELLED') ? 'warn'
      : 'neutral';

    await send({
      to: email, from: FROM,
      subject: `Project update — ${projectName} is now ${label}`,
      html: layout(
        t.h('Project status update') +
        t.tag(label, variant) +
        t.p(`Hi ${clientName}, the status of <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> has been updated to <strong style="color:#0f0f0f;font-weight:600;">${label}</strong>.`) +
        t.btn('View your project', portalUrl)
      ),
    });
  },

  // ── Client: Milestone completed ─────────────────────────────────────────────

  async sendMilestoneCompleted(
    email: string,
    clientName: string,
    milestoneName: string,
    projectName: string,
    portalUrl: string,
  ): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `Milestone completed — ${milestoneName}`,
      html: layout(
        t.h('Milestone reached') +
        t.tag('Completed', 'green') +
        t.p(`Hi ${clientName}, the milestone <strong style="color:#0f0f0f;font-weight:600;">${milestoneName}</strong> on <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> has been completed.`) +
        t.btn('View project progress', portalUrl)
      ),
    });
  },

  // ── Client: Project update posted ───────────────────────────────────────────

  async sendProjectUpdatePosted(
    email: string,
    clientName: string,
    updateTitle: string,
    projectName: string,
    portalUrl: string,
  ): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `New update on ${projectName}`,
      html: layout(
        t.h('New project update') +
        t.p(`Hi ${clientName}, there is a new update on <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong>.`) +
        t.p(`<strong style="color:#0f0f0f;font-weight:600;">${updateTitle}</strong>`) +
        t.btn('Read the update', portalUrl)
      ),
    });
  },

  // ── Client: Invoice sent ────────────────────────────────────────────────────

  async sendInvoiceNotification(
    email: string,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    dueDate: Date,
    portalUrl: string,
    pdfFilePath?: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    const formattedDue   = dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const attachments: sgMail.MailDataRequired['attachments'] = pdfFilePath && fs.existsSync(pdfFilePath)
      ? [{ content: fs.readFileSync(pdfFilePath).toString('base64'), filename: `Invoice-${invoiceNumber}.pdf`, type: 'application/pdf', disposition: 'attachment' }]
      : [];

    await send({
      to: email, from: FROM,
      subject: `Invoice ${invoiceNumber} — ${formattedAmount} due ${formattedDue}`,
      html: layout(
        t.h(`Invoice ${invoiceNumber}`) +
        t.p(`Hi ${clientName}, please find your invoice details below.`) +
        t.metaTable([
          { label: 'Invoice number', value: invoiceNumber },
          { label: 'Amount due',     value: formattedAmount },
          { label: 'Due date',       value: formattedDue },
        ]) +
        t.btn('View invoice in portal', portalUrl) +
        t.rule() +
        t.note('If you have any questions about this invoice, please get in touch with your account manager.')
      ),
      attachments,
    });
  },

  // ── Client: Deliverable ready ───────────────────────────────────────────────

  async sendDeliverableReady(
    email: string,
    clientName: string,
    deliverableTitle: string,
    projectName: string,
    portalUrl: string,
  ): Promise<void> {
    await send({
      to: email, from: FROM,
      subject: `Deliverable ready for review — ${deliverableTitle}`,
      html: layout(
        t.h('New deliverable ready') +
        t.p(`Hi ${clientName}, a deliverable is ready for your review on <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong>.`) +
        t.p(`<strong style="color:#0f0f0f;font-weight:600;">${deliverableTitle}</strong>`) +
        t.btn('Review deliverable', portalUrl) +
        t.rule() +
        t.note('You can approve the deliverable or request changes directly from the portal.')
      ),
    });
  },

  // ── Admin: Deliverable reviewed by client ───────────────────────────────────

  async sendDeliverableReviewed(
    clientName: string,
    deliverableTitle: string,
    projectName: string,
    reviewStatus: 'APPROVED' | 'CHANGES_REQUESTED',
    comment: string | null,
  ): Promise<void> {
    const approved = reviewStatus === 'APPROVED';
    await send({
      to: env.ADMIN_EMAIL, from: FROM,
      subject: approved ? `Deliverable approved — ${deliverableTitle}` : `Changes requested — ${deliverableTitle}`,
      html: layout(
        t.h(approved ? 'Deliverable approved' : 'Changes requested') +
        t.tag(approved ? 'Approved' : 'Changes requested', approved ? 'green' : 'warn') +
        t.p(`<strong style="color:#0f0f0f;font-weight:600;">${clientName}</strong> has ${approved ? 'approved' : 'requested changes on'} <strong style="color:#0f0f0f;font-weight:600;">${deliverableTitle}</strong> on project <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong>.`) +
        (comment ? t.quote(comment) : '') +
        t.btn('View in admin panel', `${env.BASE_URL}/admin`)
      ),
    });
  },

  // ── Admin: Revision request received ───────────────────────────────────────

  async sendRevisionRequestReceived(
    clientName: string,
    projectName: string,
    description: string,
  ): Promise<void> {
    await send({
      to: env.ADMIN_EMAIL, from: FROM,
      subject: `Revision request from ${clientName} — ${projectName}`,
      html: layout(
        t.h('New revision request') +
        t.p(`<strong style="color:#0f0f0f;font-weight:600;">${clientName}</strong> has submitted a revision request for <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong>.`) +
        t.quote(description) +
        t.btn('View in admin panel', `${env.BASE_URL}/admin`)
      ),
    });
  },

  // ── Client: Revision request status update ──────────────────────────────────

  async sendRevisionRequestStatusUpdate(
    email: string,
    clientName: string,
    projectName: string,
    status: 'IN_REVIEW' | 'APPROVED' | 'DECLINED',
    portalUrl: string,
  ): Promise<void> {
    const config: Record<string, { label: string; variant: 'green' | 'neutral' | 'decline'; body: string }> = {
      IN_REVIEW: {
        label:   'Under review',
        variant: 'neutral',
        body:    `Your revision request for <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> is currently being reviewed. We will be in touch shortly.`,
      },
      APPROVED: {
        label:   'Approved',
        variant: 'green',
        body:    `Your revision request for <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> has been approved. We will be in touch with next steps.`,
      },
      DECLINED: {
        label:   'Declined',
        variant: 'decline',
        body:    `Your revision request for <strong style="color:#0f0f0f;font-weight:600;">${projectName}</strong> has been declined. Please reach out to your account manager if you have questions.`,
      },
    };

    const { label, variant, body } = config[status];

    await send({
      to: email, from: FROM,
      subject: `Revision request update — ${projectName}`,
      html: layout(
        t.h('Revision request update') +
        t.tag(label, variant) +
        t.p(`Hi ${clientName}, ${body}`) +
        t.btn('View in portal', portalUrl)
      ),
    });
  },
};
