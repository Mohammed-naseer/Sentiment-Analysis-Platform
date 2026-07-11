import { Router } from 'express';
import {
  getUsers,
  approveUser,
  rejectUser,
  getAuditLogs,
  getNotifications,
  markNotificationRead,
  emailApproveAction,
  emailRejectForm,
  emailRejectSubmit,
} from '../controllers/adminController';
import { verifyToken, verifyAdmin } from '../middleware/auth';
import express from 'express';

const router = Router();

// ── Public one-click email action endpoints (secured by signed JWT in URL) ───
// These do NOT require a logged-in session; the signed token IS the auth.
router.get('/email-approve', emailApproveAction);
router.get('/email-reject', emailRejectForm);
router.post('/email-reject-submit', express.urlencoded({ extended: false }), emailRejectSubmit);

// ── Protected endpoints (require valid session token) ────────────────────────
router.use(verifyToken);

// Notifications: any authenticated approved user
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

// Admin-only endpoints
router.use(verifyAdmin);
router.get('/users', getUsers);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);
router.get('/audit-logs', getAuditLogs);

export default router;
