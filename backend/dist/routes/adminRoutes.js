"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
// ── Public one-click email action endpoints (secured by signed JWT in URL) ───
// These do NOT require a logged-in session; the signed token IS the auth.
router.get('/email-approve', adminController_1.emailApproveAction);
router.get('/email-reject', adminController_1.emailRejectForm);
router.post('/email-reject-submit', express_2.default.urlencoded({ extended: false }), adminController_1.emailRejectSubmit);
// ── Protected endpoints (require valid session token) ────────────────────────
router.use(auth_1.verifyToken);
// Notifications: any authenticated approved user
router.get('/notifications', adminController_1.getNotifications);
router.put('/notifications/:id/read', adminController_1.markNotificationRead);
// Admin-only endpoints
router.use(auth_1.verifyAdmin);
router.get('/users', adminController_1.getUsers);
router.post('/users/:id/approve', adminController_1.approveUser);
router.post('/users/:id/reject', adminController_1.rejectUser);
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
