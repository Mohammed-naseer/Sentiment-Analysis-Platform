"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUserRejectionEmail = exports.sendUserApprovalEmail = exports.sendAdminRegistrationRequest = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../utils/logger"));
// Retrieve from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '"Lumina AI Platform" <noreply@luminaai.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';
let transporter = null;
const getTransporter = async () => {
    if (transporter)
        return transporter;
    if (SMTP_USER && SMTP_PASS) {
        transporter = nodemailer_1.default.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        logger_1.default.info('[EmailService] SMTP Transporter configured.');
    }
    else {
        logger_1.default.warn('[EmailService] SMTP credentials missing. Falling back to console simulation.');
        transporter = {
            sendMail: async (mailOptions) => {
                logger_1.default.info('====================================================');
                logger_1.default.info('📩 [EMAIL SIMULATION]');
                logger_1.default.info(`FROM: ${mailOptions.from}`);
                logger_1.default.info(`TO: ${mailOptions.to}`);
                logger_1.default.info(`SUBJECT: ${mailOptions.subject}`);
                logger_1.default.info(`TEXT:\n${mailOptions.text}`);
                logger_1.default.info('====================================================');
                return { messageId: 'simulated_' + Date.now() };
            },
        };
    }
    return transporter;
};
/** Button styles for role colours */
const roleColors = {
    Admin: { bg: '#7c3aed', label: 'Admin' },
    Analyst: { bg: '#2563eb', label: 'Analyst' },
    Viewer: { bg: '#0891b2', label: 'Viewer' },
    Reader: { bg: '#059669', label: 'Reader' },
};
/**
 * Send New User Registration Request (To Admin)
 * Includes one-click Approve (×4 roles) and Reject buttons.
 */
const sendAdminRegistrationRequest = async (user, emailToken) => {
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
        logger_1.default.info(`[EmailService] Admin registration request email sent for: ${user.email}`);
    }
    catch (error) {
        logger_1.default.error('[EmailService] Error sending admin notification email:', error.message);
    }
};
exports.sendAdminRegistrationRequest = sendAdminRegistrationRequest;
/**
 * Send Approval Notification (To User)
 */
const sendUserApprovalEmail = async (user) => {
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
        logger_1.default.info(`[EmailService] User approval email sent for: ${user.email}`);
    }
    catch (error) {
        logger_1.default.error('[EmailService] Error sending approval email:', error.message);
    }
};
exports.sendUserApprovalEmail = sendUserApprovalEmail;
/**
 * Send Rejection Notification (To User)
 */
const sendUserRejectionEmail = async (user, reason) => {
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
        logger_1.default.info(`[EmailService] User rejection email sent for: ${user.email}`);
    }
    catch (error) {
        logger_1.default.error('[EmailService] Error sending rejection email:', error.message);
    }
};
exports.sendUserRejectionEmail = sendUserRejectionEmail;
