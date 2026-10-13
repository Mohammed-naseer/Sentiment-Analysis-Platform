"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerInquiry = void 0;
const mongoose_1 = require("mongoose");
const CustomerInquirySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        index: true,
    },
    phone: {
        type: String,
        trim: true,
        default: '',
    },
    company: {
        type: String,
        trim: true,
        default: '',
    },
    product: {
        type: String,
        trim: true,
        default: 'General',
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
    },
    emailStatus: {
        type: String,
        enum: ['sent', 'failed'],
        default: 'sent',
    },
    emailError: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['New', 'In_Review', 'Contacted', 'Resolved'],
        default: 'New',
        index: true,
    },
}, {
    timestamps: true,
});
exports.CustomerInquiry = (0, mongoose_1.model)('CustomerInquiry', CustomerInquirySchema);
exports.default = exports.CustomerInquiry;
