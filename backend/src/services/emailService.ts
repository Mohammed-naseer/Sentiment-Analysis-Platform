import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// Retrieve from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Lumina AI Platform" <noreply@luminaai.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    logger.info('[EmailService] SMTP Transporter configured.');
  } else {
    logger.warn('[EmailService] SMTP credentials missing. Falling back to console simulation.');
    transporter = {
      sendMail: async (mailOptions: any) => {
        logger.info('====================================================');
        logger.info('📩 [EMAIL SIMULATION]');
        logger.info(`FROM: ${mailOptions.from}`);
        logger.info(`TO: ${mailOptions.to}`);
        logger.info(`SUBJECT: ${mailOptions.subject}`);
        logger.info(`TEXT:\n${mailOptions.text}`);
        logger.info('====================================================');
        return { messageId: 'simulated_' + Date.now() };
      },
    } as any;
  }

  return transporter!;
};

/** Button styles for role colours */
const roleColors: Record<string, { bg: string; label: string }> = {
  Admin:   { bg: '#7c3aed', label: 'Admin' },
  Analyst: { bg: '#2563eb', label: 'Analyst' },
  Viewer:  { bg: '#0891b2', label: 'Viewer' },
  Reader:  { bg: '#059669', label: 'Reader' },
};

/**
 * Send New User Registration Request (To Admin)
 * Includes one-click Approve (×4 roles) and Reject buttons.
 */
export const sendAdminRegistrationRequest = async (
  user: { name: string; email: string },
  emailToken: string,
) => {
  const approveButtons = Object.entries(roleColors)
    .map(([role, { bg, label }]) => {
      const url = `${BASE_URL}/api/admin/email-approve?token=${emailToken}&role=${role}`;
      return `<a href="${url}" style="display:inline-block;background:${bg};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:13px;margin:4px">${label}</a>`;
    })
    .join('');

  const rejectUrl = `${BASE_URL}/api/admin/email-reject?token=${emailToken}`;

  const mailOptions = {
    from: SMTP_FROM,
    to: ADMIN_EMAIL,
    subject: '🔔 New User Registration Request — Lumina AI',
    text: `A new user has requested access.\n\nName: ${user.name}\nEmail: ${user.email}\nRegistration Time: ${new Date().toLocaleString()}\n\nApprove or reject via the dashboard:\n${BASE_URL}/dashboard/approval`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#ffffff">
        <h2 style="color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:10px;margin-top:0">🔔 New User Registration Request</h2>
        <p style="color:#374151">A new user has requested access to the <strong>Lumina AI Sentiment Analysis Platform</strong>.</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden">
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;font-weight:700;color:#374151;width:160px;border-bottom:1px solid #e5e7eb">Name</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${user.name}</td>
          </tr>
          <tr style="background:#ffffff">
            <td style="padding:10px 14px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb">Email</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${user.email}</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;font-weight:700;color:#374151">Registration Time</td>
            <td style="padding:10px 14px;color:#111827">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <p style="color:#374151;font-weight:600;margin-bottom:10px">✅ Approve and assign role:</p>
        <div style="margin-bottom:20px">${approveButtons}</div>

        <p style="color:#374151;font-weight:600;margin-bottom:10px">❌ Reject this request:</p>
        <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:13px">Reject User</a>

        <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="color:#6b7280;font-size:11px;margin:0">These links are valid for <strong>48 hours</strong> and can only be used once.<br/>Lumina AI Sentiment Platform — Automated notification. Do not reply.</p>
      </div>
    `,
  };

  try {
    const client = await getTransporter();
    await client.sendMail(mailOptions);
    logger.info(`[EmailService] Admin registration request email sent for: ${user.email}`);
  } catch (error: any) {
    logger.error('[EmailService] SMTP error sending admin notification email:', error.message);
    logger.info('📩 [FALLBACK CONSOLE NOTIFICATION]');
    logger.info(`TO: ${mailOptions.to}`);
    logger.info(`SUBJECT: ${mailOptions.subject}`);
    logger.info(`TEXT:\n${mailOptions.text}`);
  }
};

/**
 * Send Approval Notification (To User)
 */
export const sendUserApprovalEmail = async (user: { name: string; email: string; role: string }) => {
  const roleColor = roleColors[user.role]?.bg || '#6366f1';
  const mailOptions = {
    from: SMTP_FROM,
    to: user.email,
    subject: '🎉 Your Account Has Been Approved — Lumina AI',
    text: `Congratulations ${user.name},\n\nYour account has been approved.\nAssigned Role: ${user.role}\n\nLogin: ${BASE_URL.replace(':5001', ':5173')}/login`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px">
        <h2 style="color:#10b981;border-bottom:2px solid #10b981;padding-bottom:10px;margin-top:0">Account Approved 🎉</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Congratulations! Your account has been approved by the system administrator.</p>
        <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:14px 18px;margin:20px 0;border-radius:6px">
          <strong>Assigned Role:</strong>
          <span style="font-weight:700;color:${roleColor};font-size:15px;margin-left:6px">${user.role}</span>
        </div>
        <p>You can now log in to access your dashboard.</p>
        <div style="margin-top:24px">
          <a href="${BASE_URL.replace(':5001', ':5173')}/login" style="background:#6366f1;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block">Login to Platform →</a>
        </div>
        <p style="color:#6b7280;font-size:11px;margin-top:28px;border-top:1px solid #e5e7eb;padding-top:16px">Welcome to Lumina AI!</p>
      </div>
    `,
  };

  try {
    const client = await getTransporter();
    await client.sendMail(mailOptions);
    logger.info(`[EmailService] User approval email sent for: ${user.email}`);
  } catch (error: any) {
    logger.error('[EmailService] Error sending approval email:', error.message);
  }
};

/**
 * Send Rejection Notification (To User)
 */
export const sendUserRejectionEmail = async (user: { name: string; email: string }, reason: string) => {
  const mailOptions = {
    from: SMTP_FROM,
    to: user.email,
    subject: 'Registration Request Update — Lumina AI',
    text: `Hello ${user.name},\n\nUnfortunately, your registration request was not approved.\n\nReason:\n${reason || 'No specific reason provided.'}\n\nIf you have questions, please contact the administrator.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px">
        <h2 style="color:#ef4444;border-bottom:2px solid #ef4444;padding-bottom:10px;margin-top:0">Registration Request Not Approved</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>Unfortunately, your registration request was not approved by the system administrator.</p>
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;margin:20px 0;border-radius:6px;color:#991b1b">
          <strong>Reason:</strong><br/>${reason || 'No specific reason provided.'}
        </div>
        <p style="color:#6b7280">If you believe this was in error, please contact the support team.</p>
        <p style="color:#6b7280;font-size:11px;margin-top:28px;border-top:1px solid #e5e7eb;padding-top:16px">Lumina AI Operations Team</p>
      </div>
    `,
  };

  try {
    const client = await getTransporter();
    await client.sendMail(mailOptions);
    logger.info(`[EmailService] User rejection email sent for: ${user.email}`);
  } catch (error: any) {
    logger.error('[EmailService] Error sending rejection email:', error.message);
  }
};

/**
 * Send Workspace Invitation Email (To Invitee)
 */
export const sendInvitationEmail = async (
  invitee: { email: string; role: string; invitedByName: string },
  inviteToken: string
): Promise<boolean> => {
  const roleColor = roleColors[invitee.role]?.bg || '#6366f1';
  const acceptUrl = `${BASE_URL.replace(':5001', ':5173')}/signup?invite=${inviteToken}&email=${encodeURIComponent(invitee.email)}&role=${invitee.role}`;

  const mailOptions = {
    from: SMTP_FROM,
    to: invitee.email,
    subject: '📨 You have been invited to Lumina AI Intelligence Platform',
    text: `Hello,\n\n${invitee.invitedByName} has invited you to join Lumina AI as an ${invitee.role}.\n\nAccept your invitation and activate your account:\n${acceptUrl}\n\nThis invitation link expires in 7 days.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#ffffff">
        <h2 style="color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:10px;margin-top:0">Workspace Invitation 📨</h2>
        <p style="color:#374151">Hello,</p>
        <p style="color:#374151"><strong>${invitee.invitedByName}</strong> has invited you to join the <strong>Lumina AI Sentiment Analysis & Customer Intelligence Platform</strong>.</p>
        
        <div style="background:#f8fafc;border-left:4px solid ${roleColor};padding:14px 18px;margin:20px 0;border-radius:6px">
          <strong style="color:#374151">Assigned Role:</strong>
          <span style="font-weight:700;color:${roleColor};font-size:15px;margin-left:6px">${invitee.role}</span>
        </div>

        <p style="color:#374151">Click the button below to complete your registration and access the workspace:</p>
        <div style="margin:24px 0">
          <a href="${acceptUrl}" style="background:#6366f1;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block">Accept Invitation & Get Started →</a>
        </div>

        <p style="color:#6b7280;font-size:12px">This invitation link will expire in 7 days.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="color:#9ca3af;font-size:11px;margin:0">Lumina AI Platform · Mohammed Naseeruddin · mohammednaseer22022@gmail.com</p>
      </div>
    `,
  };

  try {
    const client = await getTransporter();
    await client.sendMail(mailOptions);
    logger.info(`[EmailService] Invitation email successfully sent to: ${invitee.email}`);
    return true;
  } catch (error: any) {
    logger.error('[EmailService] Failed to send invitation email:', error.message);
    return false;
  }
};

/**
 * Send Customer Submission Notification (Talks to Intelligence / Contact Form) To Admin
 */
export const sendCustomerInquiryNotification = async (inquiry: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  product?: string;
  message: string;
  createdAt?: Date;
}): Promise<boolean> => {
  const mailOptions = {
    from: SMTP_FROM,
    to: ADMIN_EMAIL,
    subject: `💬 New Talks to Intelligence Submission from ${inquiry.name}`,
    text: `New Customer Inquiry Received:\n\nName: ${inquiry.name}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone || 'N/A'}\nCompany: ${inquiry.company || 'N/A'}\nProduct: ${inquiry.product || 'General'}\nSubmitted At: ${(inquiry.createdAt || new Date()).toLocaleString()}\n\nMessage:\n${inquiry.message}\n`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:#ffffff">
        <h2 style="color:#0ea5e9;border-bottom:2px solid #0ea5e9;padding-bottom:10px;margin-top:0">💬 New Talks to Intelligence Submission</h2>
        <p style="color:#374151">A customer has submitted feedback through the <strong>Talks to Intelligence</strong> portal.</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden">
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;font-weight:700;color:#374151;width:150px;border-bottom:1px solid #e5e7eb">Customer Name</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${inquiry.name}</td>
          </tr>
          <tr style="background:#ffffff">
            <td style="padding:10px 14px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb">Email Address</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb"><a href="mailto:${inquiry.email}" style="color:#6366f1">${inquiry.email}</a></td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb">Phone Number</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${inquiry.phone || 'Not provided'}</td>
          </tr>
          <tr style="background:#ffffff">
            <td style="padding:10px 14px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb">Company / Org</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${inquiry.company || 'Not provided'}</td>
          </tr>
          <tr style="background:#f9fafb">
            <td style="padding:10px 14px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb">Product / Interest</td>
            <td style="padding:10px 14px;color:#111827;border-bottom:1px solid #e5e7eb">${inquiry.product || 'General'}</td>
          </tr>
          <tr style="background:#ffffff">
            <td style="padding:10px 14px;font-weight:700;color:#374151">Submission Time</td>
            <td style="padding:10px 14px;color:#111827">${(inquiry.createdAt || new Date()).toLocaleString()}</td>
          </tr>
        </table>

        <div style="background:#f0fdf4;border-left:4px solid #0ea5e9;padding:14px 18px;margin:20px 0;border-radius:6px">
          <strong style="color:#0369a1">Customer Message / Feedback:</strong>
          <p style="color:#1e293b;margin:8px 0 0;line-height:1.6;white-space:pre-wrap">${inquiry.message}</p>
        </div>

        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="color:#9ca3af;font-size:11px;margin:0">Lumina AI Platform · Automated Inquiry Dispatch · Administrator: Mohammed Naseeruddin</p>
      </div>
    `,
  };

  try {
    const client = await getTransporter();
    await client.sendMail(mailOptions);
    logger.info(`[EmailService] Admin customer inquiry notification sent to: ${ADMIN_EMAIL}`);
    return true;
  } catch (error: any) {
    logger.error('[EmailService] Failed to send admin customer inquiry notification email:', error.message);
    return false;
  }
};

