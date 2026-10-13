"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const AuditLogSchema = new mongoose_1.Schema({
    action: {
        type: String,
        required: true,
        enum: ['Approve', 'Reject', 'ChangeRole', 'Invite', 'Block', 'Delete'],
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    targetUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assignedRole: {
        type: String,
        default: '',
    },
    rejectionReason: {
        type: String,
        default: '',
    },
    details: {
        type: String,
        default: '',
    },
    ipAddress: {
        type: String,
        required: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
exports.AuditLog = (0, mongoose_1.model)('AuditLog', AuditLogSchema);
exports.default = exports.AuditLog;
