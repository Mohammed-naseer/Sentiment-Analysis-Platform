"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailRejectSubmit = exports.emailRejectForm = exports.emailApproveAction = exports.markNotificationRead = exports.getNotifications = exports.getAuditLogs = exports.rejectUser = exports.approveUser = exports.getUsers = void 0;
exports.generateEmailActionToken = generateEmailActionToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const Notification_1 = require("../models/Notification");
const emailService_1 = require("../services/emailService");
const response_1 = require("../utils/response");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
/** Generate a signed token for one-click email actions (48h expiry) */
function generateEmailActionToken(userId, userName, userEmail) {
    return jsonwebtoken_1.default.sign({ userId, userName, userEmail, type: 'email_action' }, env_1.config.jwtSecret, { expiresIn: '48h' });
}
/**
 * Get All Users
 * GET /api/admin/users
 */
const getUsers = async (_req, res) => {
    try {
        const users = await User_1.User.find().sort({ createdAt: -1 });
        (0, response_1.sendSuccess)(res, 'Users retrieved successfully.', { users });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Get users failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve users.', error.message || error, 500);
    }
};
exports.getUsers = getUsers;
/**
 * Approve User Request
 * POST /api/admin/users/:id/approve
 */
const approveUser = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];
    if (!role || !validRoles.includes(role)) {
        (0, response_1.sendError)(res, 'A valid role (Admin, Analyst, Viewer, or Reader) is required.', 'ValidationError', 400);
        return;
    }
    try {
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'User not found.', 'UserNotFoundError', 404);
            return;
        }
        if (user.approved) {
            (0, response_1.sendError)(res, 'User is already approved.', 'UserAlreadyApprovedError', 400);
            return;
        }
        // Update User in DB
        user.approved = true;
        user.status = 'Approved';
        user.role = role;
        await user.save();
        // Create Audit Log
        const adminId = req.user._id;
        await AuditLog_1.AuditLog.create({
            action: 'Approve',
            adminId,
            targetUserId: user._id,
            assignedRole: role,
            ipAddress: req.ip || '127.0.0.1',
        });
        // Create Notification for the approved user
        await Notification_1.Notification.create({
            userId: user._id,
            title: 'Account Approved 🎉',
            message: `Congratulations! Your account has been approved. Assigned Role: ${role}.`,
            type: 'info',
        });
        // Send email to user
        await (0, emailService_1.sendUserApprovalEmail)({ name: user.name, email: user.email, role });
        (0, response_1.sendSuccess)(res, `User request approved successfully. Role assigned: ${role}.`, {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                status: user.status,
                role: user.role,
                approved: user.approved,
            }
        });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Approve user failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to approve user request.', error.message || error, 500);
    }
};
exports.approveUser = approveUser;
/**
 * Reject User Request
 * POST /api/admin/users/:id/reject
 */
const rejectUser = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
        (0, response_1.sendError)(res, 'Rejection reason is required.', 'ValidationError', 400);
        return;
    }
    try {
        const user = await User_1.User.findById(id);
        if (!user) {
            (0, response_1.sendError)(res, 'User not found.', 'UserNotFoundError', 404);
            return;
        }
        if (user.status === 'Rejected') {
            (0, response_1.sendError)(res, 'User request is already rejected.', 'UserAlreadyRejectedError', 400);
            return;
        }
        // Update User in DB
        user.approved = false;
        user.status = 'Rejected';
        user.rejectionReason = reason;
        await user.save();
        // Create Audit Log
        const adminId = req.user._id;
        await AuditLog_1.AuditLog.create({
            action: 'Reject',
            adminId,
            targetUserId: user._id,
            rejectionReason: reason,
            ipAddress: req.ip || '127.0.0.1',
        });
        // Create Notification for the rejected user
        await Notification_1.Notification.create({
            userId: user._id,
            title: 'Registration Request Rejected ⚠️',
            message: `Your registration request was not approved. Reason: ${reason}`,
            type: 'alert',
        });
        // Send email to user
        await (0, emailService_1.sendUserRejectionEmail)({ name: user.name, email: user.email }, reason);
        (0, response_1.sendSuccess)(res, 'User request rejected successfully.', {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                status: user.status,
                role: user.role,
                approved: user.approved,
                rejectionReason: user.rejectionReason,
            }
        });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Reject user failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to reject user request.', error.message || error, 500);
    }
};
exports.rejectUser = rejectUser;
/**
 * Get Audit Logs
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (_req, res) => {
    try {
        const logs = await AuditLog_1.AuditLog.find()
            .populate('adminId', 'name email')
            .populate('targetUserId', 'name email')
            .sort({ createdAt: -1 });
        (0, response_1.sendSuccess)(res, 'Audit logs retrieved successfully.', { logs });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Get audit logs failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve audit logs.', error.message || error, 500);
    }
};
exports.getAuditLogs = getAuditLogs;
/**
 * Get Notifications
 * GET /api/admin/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification_1.Notification.find({ userId }).sort({ createdAt: -1 });
        (0, response_1.sendSuccess)(res, 'Notifications retrieved successfully.', { notifications });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Get notifications failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve notifications.', error.message || error, 500);
    }
};
exports.getNotifications = getNotifications;
/**
 * Mark Notification as Read
 * PUT /api/admin/notifications/:id/read
 */
const markNotificationRead = async (req, res) => {
    const { id } = req.params;
    try {
        const notification = await Notification_1.Notification.findOneAndUpdate({ _id: id, userId: req.user._id }, { read: true }, { new: true });
        if (!notification) {
            (0, response_1.sendError)(res, 'Notification not found.', 'NotificationNotFoundError', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, 'Notification marked as read successfully.', { notification });
    }
    catch (error) {
        logger_1.default.error('[AdminController] Mark notification read failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to update notification.', error.message || error, 500);
    }
};
exports.markNotificationRead = markNotificationRead;
// ── HTML helpers ─────────────────────────────────────────────────────────────
const htmlPage = (icon, title, color, body) => `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Lumina AI</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,Arial,sans-serif;background:#0f0f14;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#1a1a24;border:1px solid #2a2a38;border-radius:16px;padding:40px 36px;max-width:480px;width:100%;text-align:center}
  .icon{font-size:56px;margin-bottom:16px}
  h1{color:${color};font-size:22px;font-weight:700;margin-bottom:10px}
  p{color:#9ca3af;font-size:14px;line-height:1.6;margin-bottom:8px}
  .badge{display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-top:8px}
  .footer{color:#4b5563;font-size:11px;margin-top:24px;border-top:1px solid #2a2a38;padding-top:16px}
</style></head><body>
<div class="card">
  <div class="icon">${icon}</div>
  <h1>${title}</h1>
  ${body}
  <div class="footer">Lumina AI Sentiment Platform · Automated Action</div>
</div></body></html>`;
/**
 * One-click Approve from email link
 * GET /api/admin/email-approve?token=xxx&role=Analyst
 */
const emailApproveAction = async (req, res) => {
    const { token, role } = req.query;
    const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];
    if (!token) {
        res.status(400).send(htmlPage('⚠️', 'Invalid Link', '#f59e0b', '<p>This link is missing a required security token.</p>'));
        return;
    }
    if (!role || !validRoles.includes(role)) {
        res.status(400).send(htmlPage('⚠️', 'Invalid Role', '#f59e0b', '<p>The role specified in this link is not valid.</p>'));
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        if (payload.type !== 'email_action')
            throw new Error('Wrong token type');
        const user = await User_1.User.findById(payload.userId);
        if (!user) {
            res.status(404).send(htmlPage('❌', 'User Not Found', '#ef4444', '<p>The user associated with this link could not be found.</p>'));
            return;
        }
        if (user.approved) {
            res.send(htmlPage('✅', 'Already Approved', '#10b981', `<p>${user.name} has already been approved.</p><span class="badge">${user.role}</span>`));
            return;
        }
        user.approved = true;
        user.status = 'Approved';
        user.role = role;
        await user.save();
        // Audit log (no specific admin user here — log as system)
        await AuditLog_1.AuditLog.create({ action: 'Approve', adminId: user._id, targetUserId: user._id, assignedRole: role, ipAddress: req.ip || 'email-link' });
        // Notify user
        await Notification_1.Notification.create({ userId: user._id, title: 'Account Approved 🎉', message: `Your account has been approved. Assigned Role: ${role}.`, type: 'info' });
        await (0, emailService_1.sendUserApprovalEmail)({ name: user.name, email: user.email, role });
        logger_1.default.info(`[EmailAction] Approved ${user.email} as ${role} via email link.`);
        res.send(htmlPage('🎉', 'User Approved!', '#10b981', `
      <p>You have successfully approved:</p>
      <p style="color:#f9fafb;font-weight:600;margin-top:6px">${user.name}</p>
      <p style="color:#9ca3af">${user.email}</p>
      <span class="badge">${role}</span>
      <p style="margin-top:16px">An email confirmation has been sent to the user.</p>
    `));
    }
    catch (err) {
        const expired = err.name === 'TokenExpiredError';
        res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b', `<p>${expired ? 'This approval link has expired (valid for 48 hours). Please go to the dashboard to approve manually.' : 'This link is invalid or has already been used.'}</p>`));
    }
};
exports.emailApproveAction = emailApproveAction;
/**
 * Show inline rejection form
 * GET /api/admin/email-reject?token=xxx
 */
const emailRejectForm = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        res.status(400).send(htmlPage('⚠️', 'Invalid Link', '#f59e0b', '<p>Missing token.</p>'));
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        if (payload.type !== 'email_action')
            throw new Error('Wrong token type');
        res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Reject User — Lumina AI</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,Arial,sans-serif;background:#0f0f14;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#1a1a24;border:1px solid #2a2a38;border-radius:16px;padding:40px 36px;max-width:480px;width:100%}
  h1{color:#ef4444;font-size:20px;font-weight:700;margin-bottom:6px}
  .sub{color:#9ca3af;font-size:13px;margin-bottom:24px}
  .info{background:#111118;border:1px solid #2a2a38;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px}
  .info span{color:#6366f1;font-weight:600}
  label{display:block;color:#d1d5db;font-size:13px;font-weight:600;margin-bottom:6px}
  textarea{width:100%;background:#111118;border:1px solid #374151;border-radius:8px;color:#f9fafb;font-size:14px;padding:12px;resize:vertical;min-height:100px;outline:none;font-family:inherit}
  textarea:focus{border-color:#6366f1}
  button{margin-top:16px;width:100%;background:#ef4444;color:#fff;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:600;cursor:pointer}
  button:hover{background:#dc2626}
  .footer{color:#4b5563;font-size:11px;margin-top:20px;text-align:center}
</style></head><body>
<div class="card">
  <h1>❌ Reject Registration Request</h1>
  <p class="sub">This action will notify the user via email.</p>
  <div class="info">
    <div>Name: <span>${payload.userName}</span></div>
    <div style="margin-top:4px">Email: <span>${payload.userEmail}</span></div>
  </div>
  <form method="POST" action="/api/admin/email-reject-submit">
    <input type="hidden" name="token" value="${token}"/>
    <label>Rejection Reason <span style="color:#ef4444">*</span></label>
    <textarea name="reason" required placeholder="e.g. Incomplete information, unauthorized domain…"></textarea>
    <button type="submit">Confirm Rejection</button>
  </form>
  <div class="footer">Lumina AI Sentiment Platform · Automated Action</div>
</div></body></html>`);
    }
    catch (err) {
        const expired = err.name === 'TokenExpiredError';
        res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b', '<p>This link has expired or is invalid.</p>'));
    }
};
exports.emailRejectForm = emailRejectForm;
/**
 * Submit rejection from inline form
 * POST /api/admin/email-reject-submit
 */
const emailRejectSubmit = async (req, res) => {
    const { token, reason } = req.body;
    if (!token || !reason?.trim()) {
        res.status(400).send(htmlPage('⚠️', 'Missing Fields', '#f59e0b', '<p>A rejection reason is required.</p>'));
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
        if (payload.type !== 'email_action')
            throw new Error('Wrong token type');
        const user = await User_1.User.findById(payload.userId);
        if (!user) {
            res.status(404).send(htmlPage('❌', 'User Not Found', '#ef4444', '<p>User not found.</p>'));
            return;
        }
        if (user.status === 'Rejected') {
            res.send(htmlPage('ℹ️', 'Already Rejected', '#f59e0b', `<p>${user.name}'s request was already rejected.</p>`));
            return;
        }
        user.approved = false;
        user.status = 'Rejected';
        user.rejectionReason = reason.trim();
        await user.save();
        await AuditLog_1.AuditLog.create({ action: 'Reject', adminId: user._id, targetUserId: user._id, rejectionReason: reason.trim(), ipAddress: req.ip || 'email-link' });
        await Notification_1.Notification.create({ userId: user._id, title: 'Registration Request Rejected', message: `Your request was rejected. Reason: ${reason.trim()}`, type: 'alert' });
        await (0, emailService_1.sendUserRejectionEmail)({ name: user.name, email: user.email }, reason.trim());
        logger_1.default.info(`[EmailAction] Rejected ${user.email} via email link.`);
        res.send(htmlPage('🚫', 'User Rejected', '#ef4444', `
      <p>You have rejected the registration request for:</p>
      <p style="color:#f9fafb;font-weight:600;margin-top:6px">${user.name}</p>
      <p style="color:#9ca3af">${user.email}</p>
      <p style="margin-top:16px">The user has been notified via email.</p>
    `));
    }
    catch (err) {
        const expired = err.name === 'TokenExpiredError';
        res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b', '<p>This link has expired or is invalid.</p>'));
    }
};
exports.emailRejectSubmit = emailRejectSubmit;
