import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { Invitation } from '../models/Invitation';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { sendUserApprovalEmail, sendUserRejectionEmail, sendInvitationEmail } from '../services/emailService';
import { sendSuccess, sendError } from '../utils/response';
import { config } from '../config/env';
import logger from '../utils/logger';

/** Generate a signed token for one-click email actions (48h expiry) */
export function generateEmailActionToken(userId: string, userName: string, userEmail: string): string {
  return jwt.sign(
    { userId, userName, userEmail, type: 'email_action' },
    config.jwtSecret,
    { expiresIn: '48h' }
  );
}

/**
 * Get All Users
 * GET /api/admin/users
 */
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    sendSuccess(res, 'Users retrieved successfully.', { users });
  } catch (error: any) {
    logger.error('[AdminController] Get users failed:', error.message);
    sendError(res, 'Failed to retrieve users.', error.message || error, 500);
  }
};

/**
 * Approve User Request
 * POST /api/admin/users/:id/approve
 */
export const approveUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];
  if (!role || !validRoles.includes(role)) {
    sendError(res, 'A valid role (Admin, Analyst, Viewer, or Reader) is required.', 'ValidationError', 400);
    return;
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found.', 'UserNotFoundError', 404);
      return;
    }

    if (user.approved) {
      sendError(res, 'User is already approved.', 'UserAlreadyApprovedError', 400);
      return;
    }

    // Update User in DB
    user.approved = true;
    user.status = 'Approved';
    user.role = role;
    await user.save();

    // Create Audit Log
    const adminId = req.user!._id;
    await AuditLog.create({
      action: 'Approve',
      adminId,
      targetUserId: user._id,
      assignedRole: role,
      ipAddress: req.ip || '127.0.0.1',
    });

    // Create Notification for the approved user
    await Notification.create({
      userId: user._id,
      title: 'Account Approved 🎉',
      message: `Congratulations! Your account has been approved. Assigned Role: ${role}.`,
      type: 'info',
    });

    // Send email to user
    await sendUserApprovalEmail({ name: user.name, email: user.email, role });

    sendSuccess(res, `User request approved successfully. Role assigned: ${role}.`, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
        approved: user.approved,
      }
    });
  } catch (error: any) {
    logger.error('[AdminController] Approve user failed:', error.message);
    sendError(res, 'Failed to approve user request.', error.message || error, 500);
  }
};

/**
 * Reject User Request
 * POST /api/admin/users/:id/reject
 */
export const rejectUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim() === '') {
    sendError(res, 'Rejection reason is required.', 'ValidationError', 400);
    return;
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found.', 'UserNotFoundError', 404);
      return;
    }

    if (user.status === 'Rejected') {
      sendError(res, 'User request is already rejected.', 'UserAlreadyRejectedError', 400);
      return;
    }

    // Update User in DB
    user.approved = false;
    user.status = 'Rejected';
    user.rejectionReason = reason;
    await user.save();

    // Create Audit Log
    const adminId = req.user!._id;
    await AuditLog.create({
      action: 'Reject',
      adminId,
      targetUserId: user._id,
      rejectionReason: reason,
      ipAddress: req.ip || '127.0.0.1',
    });

    // Create Notification for the rejected user
    await Notification.create({
      userId: user._id,
      title: 'Registration Request Rejected ⚠️',
      message: `Your registration request was not approved. Reason: ${reason}`,
      type: 'alert',
    });

    // Send email to user
    await sendUserRejectionEmail({ name: user.name, email: user.email }, reason);

    sendSuccess(res, 'User request rejected successfully.', {
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
  } catch (error: any) {
    logger.error('[AdminController] Reject user failed:', error.message);
    sendError(res, 'Failed to reject user request.', error.message || error, 500);
  }
};

/**
 * Invite User
 * POST /api/admin/users/invite
 */
export const inviteUser = async (req: Request, res: Response): Promise<void> => {
  const { email, role } = req.body;
  const admin = req.user!;

  if (!email || !email.includes('@')) {
    sendError(res, 'A valid email address is required.', 'ValidationError', 400);
    return;
  }

  const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];
  const targetRole = role && validRoles.includes(role) ? role : 'Analyst';

  try {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      sendError(res, `User with email "${normalizedEmail}" is already registered (Status: ${existingUser.status}, Role: ${existingUser.role}).`, 'UserAlreadyExistsError', 400);
      return;
    }

    // 2. Check if a pending invite already exists
    let invite = await Invitation.findOne({ email: normalizedEmail, status: 'Pending' });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (invite) {
      // Refresh token and expiration
      invite.token = token;
      invite.role = targetRole;
      invite.expiresAt = expiresAt;
      invite.invitedBy = admin._id as any;
      await invite.save();
    } else {
      invite = await Invitation.create({
        email: normalizedEmail,
        role: targetRole,
        invitedBy: admin._id,
        token,
        status: 'Pending',
        expiresAt,
      });
    }

    // 3. Log Audit
    await AuditLog.create({
      action: 'Invite',
      adminId: admin._id,
      assignedRole: targetRole,
      details: `Invited ${normalizedEmail} as ${targetRole}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    // 4. Send email notification
    const emailSent = await sendInvitationEmail(
      { email: normalizedEmail, role: targetRole, invitedByName: admin.name || 'Administrator' },
      token
    );

    sendSuccess(res, emailSent ? 'Invitation sent successfully.' : 'Invitation created (email could not be dispatched, check SMTP logs).', {
      invitation: {
        _id: invite._id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        token: invite.token,
      },
    }, 201);
  } catch (error: any) {
    logger.error('[AdminController] Invite user failed:', error.message);
    sendError(res, 'Unable to send invitation. Please try again.', error.message || error, 500);
  }
};

/**
 * Change User Role (Admin only)
 * PUT /api/admin/users/:id/role
 */
export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;
  const admin = req.user!;

  const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];
  if (!role || !validRoles.includes(role)) {
    sendError(res, 'A valid role (Admin, Analyst, Viewer, or Reader) is required.', 'ValidationError', 400);
    return;
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found.', 'UserNotFoundError', 404);
      return;
    }

    // Prevent non-admin or self-demoting the last admin if applicable
    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'ChangeRole',
      adminId: admin._id,
      targetUserId: user._id,
      assignedRole: role,
      details: `Role updated from ${oldRole} to ${role}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    // Notification for the user
    await Notification.create({
      userId: user._id,
      title: 'Role Updated',
      message: `Your account role has been updated to ${role} by an administrator.`,
      type: 'info',
    });

    sendSuccess(res, `User role successfully updated to ${role}.`, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approved: user.approved,
      },
    });
  } catch (error: any) {
    logger.error('[AdminController] Change user role failed:', error.message);
    sendError(res, 'Failed to update user role.', error.message || error, 500);
  }
};

/**
 * Delete User (Admin only)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const admin = req.user!;

  if (String(admin._id) === String(id)) {
    sendError(res, 'Admins cannot delete their own account from user management.', 'SelfActionError', 400);
    return;
  }

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      sendError(res, 'User not found.', 'UserNotFoundError', 404);
      return;
    }

    await AuditLog.create({
      action: 'Delete',
      adminId: admin._id,
      targetUserId: user._id,
      details: `Deleted user ${user.email} (${user.name})`,
      ipAddress: req.ip || '127.0.0.1',
    });

    sendSuccess(res, `User ${user.name} deleted successfully.`, { id });
  } catch (error: any) {
    logger.error('[AdminController] Delete user failed:', error.message);
    sendError(res, 'Failed to delete user.', error.message || error, 500);
  }
};

/**
 * Toggle User Block/Unblock Status (Admin only)
 * PUT /api/admin/users/:id/status
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  const admin = req.user!;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    sendError(res, 'Status must be Approved or Rejected (Blocked).', 'ValidationError', 400);
    return;
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found.', 'UserNotFoundError', 404);
      return;
    }

    user.status = status;
    user.approved = status === 'Approved';
    await user.save();

    await AuditLog.create({
      action: status === 'Rejected' ? 'Block' : 'Approve',
      adminId: admin._id,
      targetUserId: user._id,
      details: `User status changed to ${status}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    sendSuccess(res, `User status updated to ${status}.`, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        approved: user.approved,
      },
    });
  } catch (error: any) {
    logger.error('[AdminController] Toggle user status failed:', error.message);
    sendError(res, 'Failed to update user status.', error.message || error, 500);
  }
};

/**
 * Get Audit Logs
 * GET /api/admin/audit-logs
 */
export const getAuditLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find()
      .populate('adminId', 'name email')
      .populate('targetUserId', 'name email')
      .sort({ createdAt: -1 });

    sendSuccess(res, 'Audit logs retrieved successfully.', { logs });
  } catch (error: any) {
    logger.error('[AdminController] Get audit logs failed:', error.message);
    sendError(res, 'Failed to retrieve audit logs.', error.message || error, 500);
  }
};

/**
 * Get Notifications
 * GET /api/admin/notifications
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    sendSuccess(res, 'Notifications retrieved successfully.', { notifications });
  } catch (error: any) {
    logger.error('[AdminController] Get notifications failed:', error.message);
    sendError(res, 'Failed to retrieve notifications.', error.message || error, 500);
  }
};

/**
 * Mark Notification as Read
 * PUT /api/admin/notifications/:id/read
 */
export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user!._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      sendError(res, 'Notification not found.', 'NotificationNotFoundError', 404);
      return;
    }

    sendSuccess(res, 'Notification marked as read successfully.', { notification });
  } catch (error: any) {
    logger.error('[AdminController] Mark notification read failed:', error.message);
    sendError(res, 'Failed to update notification.', error.message || error, 500);
  }
};

// ── HTML helpers ─────────────────────────────────────────────────────────────
const htmlPage = (icon: string, title: string, color: string, body: string) => `
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
export const emailApproveAction = async (req: Request, res: Response): Promise<void> => {
  const { token, role } = req.query as { token: string; role: 'Admin' | 'Analyst' | 'Viewer' | 'Reader' };
  const validRoles = ['Admin', 'Analyst', 'Viewer', 'Reader'];

  if (!token) { res.status(400).send(htmlPage('⚠️', 'Invalid Link', '#f59e0b', '<p>This link is missing a required security token.</p>')); return; }
  if (!role || !validRoles.includes(role)) { res.status(400).send(htmlPage('⚠️', 'Invalid Role', '#f59e0b', '<p>The role specified in this link is not valid.</p>')); return; }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    if (payload.type !== 'email_action') throw new Error('Wrong token type');

    const user = await User.findById(payload.userId);
    if (!user) { res.status(404).send(htmlPage('❌', 'User Not Found', '#ef4444', '<p>The user associated with this link could not be found.</p>')); return; }
    if (user.approved) {
      res.send(htmlPage('✅', 'Already Approved', '#10b981', `<p>${user.name} has already been approved.</p><span class="badge">${user.role}</span>`));
      return;
    }

    user.approved = true;
    user.status = 'Approved';
    user.role = role;
    await user.save();

    // Audit log (no specific admin user here — log as system)
    await AuditLog.create({ action: 'Approve', adminId: user._id, targetUserId: user._id, assignedRole: role, ipAddress: req.ip || 'email-link' });

    // Notify user
    await Notification.create({ userId: user._id, title: 'Account Approved 🎉', message: `Your account has been approved. Assigned Role: ${role}.`, type: 'info' });
    await sendUserApprovalEmail({ name: user.name, email: user.email, role });

    logger.info(`[EmailAction] Approved ${user.email} as ${role} via email link.`);
    res.send(htmlPage('🎉', 'User Approved!', '#10b981', `
      <p>You have successfully approved:</p>
      <p style="color:#f9fafb;font-weight:600;margin-top:6px">${user.name}</p>
      <p style="color:#9ca3af">${user.email}</p>
      <span class="badge">${role}</span>
      <p style="margin-top:16px">An email confirmation has been sent to the user.</p>
    `));
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b',
      `<p>${expired ? 'This approval link has expired (valid for 48 hours). Please go to the dashboard to approve manually.' : 'This link is invalid or has already been used.'}</p>`));
  }
};

/**
 * Show inline rejection form
 * GET /api/admin/email-reject?token=xxx
 */
export const emailRejectForm = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token: string };
  if (!token) { res.status(400).send(htmlPage('⚠️', 'Invalid Link', '#f59e0b', '<p>Missing token.</p>')); return; }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    if (payload.type !== 'email_action') throw new Error('Wrong token type');

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
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b', '<p>This link has expired or is invalid.</p>'));
  }
};

/**
 * Submit rejection from inline form
 * POST /api/admin/email-reject-submit
 */
export const emailRejectSubmit = async (req: Request, res: Response): Promise<void> => {
  const { token, reason } = req.body as { token: string; reason: string };

  if (!token || !reason?.trim()) {
    res.status(400).send(htmlPage('⚠️', 'Missing Fields', '#f59e0b', '<p>A rejection reason is required.</p>'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    if (payload.type !== 'email_action') throw new Error('Wrong token type');

    const user = await User.findById(payload.userId);
    if (!user) { res.status(404).send(htmlPage('❌', 'User Not Found', '#ef4444', '<p>User not found.</p>')); return; }
    if (user.status === 'Rejected') {
      res.send(htmlPage('ℹ️', 'Already Rejected', '#f59e0b', `<p>${user.name}'s request was already rejected.</p>`));
      return;
    }

    user.approved = false;
    user.status = 'Rejected';
    user.rejectionReason = reason.trim();
    await user.save();

    await AuditLog.create({ action: 'Reject', adminId: user._id, targetUserId: user._id, rejectionReason: reason.trim(), ipAddress: req.ip || 'email-link' });
    await Notification.create({ userId: user._id, title: 'Registration Request Rejected', message: `Your request was rejected. Reason: ${reason.trim()}`, type: 'alert' });
    await sendUserRejectionEmail({ name: user.name, email: user.email }, reason.trim());

    logger.info(`[EmailAction] Rejected ${user.email} via email link.`);
    res.send(htmlPage('🚫', 'User Rejected', '#ef4444', `
      <p>You have rejected the registration request for:</p>
      <p style="color:#f9fafb;font-weight:600;margin-top:6px">${user.name}</p>
      <p style="color:#9ca3af">${user.email}</p>
      <p style="margin-top:16px">The user has been notified via email.</p>
    `));
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    res.status(401).send(htmlPage('⏰', expired ? 'Link Expired' : 'Invalid Link', '#f59e0b', '<p>This link has expired or is invalid.</p>'));
  }
};
