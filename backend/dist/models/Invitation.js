"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Invitation = void 0;
const mongoose_1 = require("mongoose");
const InvitationSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        index: true,
    },
    role: {
        type: String,
        enum: ['Admin', 'Analyst', 'Viewer', 'Reader'],
        default: 'Analyst',
        required: true,
    },
    invitedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Expired'],
        default: 'Pending',
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
exports.Invitation = (0, mongoose_1.model)('Invitation', InvitationSchema);
exports.default = exports.Invitation;
