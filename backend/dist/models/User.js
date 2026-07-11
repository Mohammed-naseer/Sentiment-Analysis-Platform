"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    firebaseUid: {
        type: String,
        required: [true, 'Firebase UID is required'],
        unique: true,
        index: true,
    },
    photoURL: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    role: {
        type: String,
        enum: ['Admin', 'Analyst', 'Viewer', 'Reader', 'Pending'],
        default: 'Pending',
    },
    approved: {
        type: Boolean,
        default: false,
    },
    rejectionReason: {
        type: String,
        default: '',
    },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
exports.User = (0, mongoose_1.model)('User', UserSchema);
exports.default = exports.User;
