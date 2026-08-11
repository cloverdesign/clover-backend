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
// Colors: black (#0f0f0f) + clover green (#2E7D52)

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f2f2f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f0f0f; }
    .wrap { max-width: 560px; margin: 48px auto 64px; }
    .card { background: #ffffff; border-radius: 6px; overflow: hidden; }
    .hd { background: #0f0f0f; padding: 22px 36px; }
    .hd-name { font-size: 17px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px; }
    .hd-dot { display: inline-block; width: 6px; height: 6px; background: #2E7D52; border-radius: 50%; margin-left: 3px; vertical-align: middle; position: relative; top: -1px; }
    .bd { padding: 36px 36px 40px; }
    .heading { font-size: 21px; font-weight: 700; color: #0f0f0f; letter-spacing: -0.4px; margin-bottom: 14px; line-height: 1.3; }
    .text { font-size: 15px; line-height: 1.7; color: #4b5563; margin-bottom: 14px; }
    .text:last-child { margin-bottom: 0; }
    .text strong { color: #0f0f0f; font-weight: 600; }
    .otp-wrap { background: #f8f8f8; border: 1px solid #ebebeb; border-radius: 6px; padding: 28px 20px; text-align: center; margin: 28px 0; }
    .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 14px; color: #0f0f0f; font-variant-numeric: tabular-nums; }
    .otp-exp { font-size: 12px; color: #9ca3af; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
    .btn { display: inline-block; background: #2E7D52; color: #ffffff !important; text-decoration: none; padding: 13px 26px; border-radius: 4px; font-size: 14px; font-weight: 600; letter-spacing: 0.1px; margin: 20px 0 4px; }
    .tag { display: inline-block; background: #eaf4ee; color: #2E7D52; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 100px; margin-bottom: 18px; letter-spacing: 0.2px; }
    .tag.neutral { background: #f3f4f6; color: #6b7280; }
    .tag.warn { background: #fef3e2; color: #c17a0c; }
    .tag.decline { background: #fef0f0; color: #d13939; }
    .rule { border: none; border-top: 1px solid #f0f0f0; margin: 28px 0; }
    .note { font-size: 13px; color: #9ca3af; line-height: 1.65; }
    .meta-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { font-size: 13px; color: #9ca3af; }
    .meta-value { font-size: 13px; color: #0f0f0f; font-weight: 500; }
    .ft { padding: 20px 36px; border-top: 1px solid #eeeeee; }
    .ft p { font-size: 12px; color: #c4c4c4; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hd">
        <span class="hd-name">${env.SENDGRID_FROM_NAME}<span class="hd-dot"></span></span>
      </div>
      <div class="bd">
        ${body}
      </div>
      <div class="ft">
        <p>This email was sent by ${env.SENDGRID_FROM_NAME}. Please do not reply directly to this message.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email methods ────────────────────────────────────────────────────────────

export const mailer = {

  // ── Admin: Registration email verification ──────────────────────────────────

  async sendAdminVerificationEmail(email: string, name: string, verificationUrl: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: 'Verify your admin account',
      html: layout(`
        <p class="heading">Verify your email</p>
        <p class="text">Hi ${name}, welcome to the ${env.SENDGRID_FROM_NAME} admin panel. Click the button below to verify your email address and activate your account.</p>
        <a class="btn" href="${verificationUrl}">Verify email address</a>
        <hr class="rule" />
        <p class="note">This link expires in 24 hours. If you did not create an admin account, you can safely ignore this email.</p>
      `),
    });
  },

  // ── Super admin: new admin awaiting approval ────────────────────────────────

  async sendAdminApprovalRequest(newAdminName: string, newAdminEmail: string, approvalUrl: string): Promise<void> {
    await send({
      to: env.ADMIN_EMAIL,
      from: FROM,
      subject: `New admin account awaiting approval — ${newAdminName}`,
      html: layout(`
        <p class="heading">New admin account</p>
        <p class="text"><strong>${newAdminName}</strong> (${newAdminEmail}) has registered and verified their email. Their account is awaiting your approval before they can sign in.</p>
        <a class="btn" href="${approvalUrl}">Review in admin panel</a>
        <hr class="rule" />
        <p class="note">If you do not recognise this person, you can ignore this email. They will not be able to access the admin panel until approved.</p>
      `),
    });
  },

  // ── Admin: account approved notification ────────────────────────────────────

  async sendAdminAccountApproved(email: string, name: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: 'Your admin account has been approved',
      html: layout(`
        <p class="heading">Account approved</p>
        <p class="text">Hi ${name}, your admin account has been approved. You can now sign in to the admin panel.</p>
        <hr class="rule" />
        <p class="note">Sign in with your email and password. You will receive a one-time code to complete the sign-in.</p>
      `),
    });
  },

  // ── Admin: Login OTP ────────────────────────────────────────────────────────

  async sendAdminLoginOtp(email: string, name: string, code: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: `${code} is your sign-in code`,
      html: layout(`
        <p class="heading">Admin sign-in</p>
        <p class="text">Hi ${name}, use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
        <div class="otp-wrap">
          <div class="otp-code">${code}</div>
          <div class="otp-exp">Expires in 10 minutes</div>
        </div>
        <p class="note">If you did not attempt to sign in, your account may be at risk. Please change your password immediately.</p>
      `),
    });
  },

  // ── Client: Passwordless login OTP ─────────────────────────────────────────

  async sendOtp(email: string, clientName: string, code: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: `${code} is your sign-in code`,
      html: layout(`
        <p class="heading">Your sign-in code</p>
        <p class="text">Hi ${clientName}, use the code below to access your client portal. It expires in <strong>10 minutes</strong>.</p>
        <div class="otp-wrap">
          <div class="otp-code">${code}</div>
          <div class="otp-exp">Expires in 10 minutes</div>
        </div>
        <p class="note">If you did not request this code, you can safely ignore this email.</p>
      `),
    });
  },

  // ── Client: Portal invite ───────────────────────────────────────────────────

  async sendPortalInvite(email: string, clientName: string, portalUrl: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: `You have been invited to the ${env.SENDGRID_FROM_NAME} client portal`,
      html: layout(`
        <p class="heading">Welcome to your portal</p>
        <p class="text">Hi ${clientName}, your client portal is ready. You can track your project progress, view deliverables, review invoices, and stay up to date — all in one place.</p>
        <a class="btn" href="${portalUrl}">Access your portal</a>
        <hr class="rule" />
        <p class="note">Sign in using this email address. We will send you a one-time code each time you log in — no password needed.</p>
      `),
    });
  },

  // ── Client: Project welcome ─────────────────────────────────────────────────

  async sendProjectWelcome(email: string, clientName: string, projectName: string, portalUrl: string): Promise<void> {
    await send({
      to: email,
      from: FROM,
      subject: `Your project is live — ${projectName}`,
      html: layout(`
        <p class="heading">Your project is set up</p>
        <p class="text">Hi ${clientName}, we have set up <strong>${projectName}</strong> on your client portal. You can track progress, view milestones, access deliverables, and review invoices from one place.</p>
        <a class="btn" href="${portalUrl}">View your project</a>
        <hr class="rule" />
        <p class="note">Sign in with this email address. We will send you a one-time code — no password needed.</p>
      `),
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
    const label = statusLabels[newStatus] ?? newStatus;
    const tagClass = newStatus === 'COMPLETED' ? '' : newStatus === 'ON_HOLD' || newStatus === 'CANCELLED' ? 'warn' : 'neutral';

    await send({
      to: email,
      from: FROM,
      subject: `Project update — ${projectName} is now ${label}`,
      html: layout(`
        <p class="heading">Project status update</p>
        <span class="tag ${tagClass}">${label}</span>
        <p class="text">Hi ${clientName}, the status of <strong>${projectName}</strong> has been updated to <strong>${label}</strong>.</p>
        <a class="btn" href="${portalUrl}">View your project</a>
      `),
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
      to: email,
      from: FROM,
      subject: `Milestone completed — ${milestoneName}`,
      html: layout(`
        <p class="heading">Milestone reached</p>
        <span class="tag">Completed</span>
        <p class="text">Hi ${clientName}, the milestone <strong>${milestoneName}</strong> on <strong>${projectName}</strong> has been completed.</p>
        <a class="btn" href="${portalUrl}">View project progress</a>
      `),
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
      to: email,
      from: FROM,
      subject: `New update on ${projectName}`,
      html: layout(`
        <p class="heading">New project update</p>
        <p class="text">Hi ${clientName}, there is a new update on <strong>${projectName}</strong>.</p>
        <p class="text"><strong>${updateTitle}</strong></p>
        <a class="btn" href="${portalUrl}">Read the update</a>
      `),
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
      ? [{
          content:     fs.readFileSync(pdfFilePath).toString('base64'),
          filename:    `Invoice-${invoiceNumber}.pdf`,
          type:        'application/pdf',
          disposition: 'attachment',
        }]
      : [];

    await send({
      to: email,
      from: FROM,
      subject: `Invoice ${invoiceNumber} — ${formattedAmount} due ${formattedDue}`,
      html: layout(`
        <p class="heading">Invoice ${invoiceNumber}</p>
        <p class="text">Hi ${clientName}, please find your invoice details below.</p>
        <div style="margin: 24px 0; padding: 20px; background: #f8f8f8; border-radius: 6px;">
          <div class="meta-row"><span class="meta-label">Invoice number</span><span class="meta-value">${invoiceNumber}</span></div>
          <div class="meta-row"><span class="meta-label">Amount due</span><span class="meta-value">${formattedAmount}</span></div>
          <div class="meta-row"><span class="meta-label">Due date</span><span class="meta-value">${formattedDue}</span></div>
        </div>
        <a class="btn" href="${portalUrl}">View invoice in portal</a>
        <hr class="rule" />
        <p class="note">If you have any questions about this invoice, please get in touch with your account manager.</p>
      `),
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
      to: email,
      from: FROM,
      subject: `Deliverable ready for review — ${deliverableTitle}`,
      html: layout(`
        <p class="heading">New deliverable ready</p>
        <p class="text">Hi ${clientName}, a deliverable is ready for your review on <strong>${projectName}</strong>.</p>
        <p class="text"><strong>${deliverableTitle}</strong></p>
        <a class="btn" href="${portalUrl}">Review deliverable</a>
        <hr class="rule" />
        <p class="note">You can approve the deliverable or request changes directly from the portal.</p>
      `),
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
    const subject  = approved
      ? `Deliverable approved — ${deliverableTitle}`
      : `Changes requested — ${deliverableTitle}`;

    await send({
      to: env.ADMIN_EMAIL,
      from: FROM,
      subject,
      html: layout(`
        <p class="heading">${approved ? 'Deliverable approved' : 'Changes requested'}</p>
        <span class="tag ${approved ? '' : 'warn'}">${approved ? 'Approved' : 'Changes requested'}</span>
        <p class="text"><strong>${clientName}</strong> has ${approved ? 'approved' : 'requested changes on'} <strong>${deliverableTitle}</strong> on project <strong>${projectName}</strong>.</p>
        ${comment ? `<div style="background:#f8f8f8;border-radius:6px;padding:16px 20px;margin:16px 0;"><p class="text" style="margin:0;color:#374151;">${comment}</p></div>` : ''}
        <a class="btn" href="${env.BASE_URL}/admin">View in admin panel</a>
      `),
    });
  },

  // ── Admin: Revision request received ───────────────────────────────────────

  async sendRevisionRequestReceived(
    clientName: string,
    projectName: string,
    description: string,
  ): Promise<void> {
    await send({
      to: env.ADMIN_EMAIL,
      from: FROM,
      subject: `Revision request from ${clientName} — ${projectName}`,
      html: layout(`
        <p class="heading">New revision request</p>
        <p class="text"><strong>${clientName}</strong> has submitted a revision request for <strong>${projectName}</strong>.</p>
        <div style="background:#f8f8f8;border-radius:6px;padding:16px 20px;margin:20px 0;">
          <p class="text" style="margin:0;color:#374151;">${description}</p>
        </div>
        <a class="btn" href="${env.BASE_URL}/admin">View in admin panel</a>
      `),
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
    const config: Record<string, { label: string; tagClass: string; body: string }> = {
      IN_REVIEW: {
        label:    'Under review',
        tagClass: 'neutral',
        body:     `Your revision request for <strong>${projectName}</strong> is currently being reviewed. We will be in touch shortly.`,
      },
      APPROVED: {
        label:    'Approved',
        tagClass: '',
        body:     `Your revision request for <strong>${projectName}</strong> has been approved. We will be in touch with next steps.`,
      },
      DECLINED: {
        label:    'Declined',
        tagClass: 'decline',
        body:     `Your revision request for <strong>${projectName}</strong> has been declined. Please reach out to your account manager if you have questions.`,
      },
    };

    const { label, tagClass, body } = config[status];

    await send({
      to: email,
      from: FROM,
      subject: `Revision request update — ${projectName}`,
      html: layout(`
        <p class="heading">Revision request update</p>
        <span class="tag ${tagClass}">${label}</span>
        <p class="text">Hi ${clientName}, ${body}</p>
        <a class="btn" href="${portalUrl}">View in portal</a>
      `),
    });
  },
};
