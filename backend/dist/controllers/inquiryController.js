"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInquiryStatus = exports.getInquiries = exports.createInquiry = void 0;
const CustomerInquiry_1 = require("../models/CustomerInquiry");
const emailService_1 = require("../services/emailService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Submit a new customer inquiry (public — no auth required)
 * POST /api/inquiries
 */
const createInquiry = async (req, res) => {
    const { name, email, phone, company, product, message } = req.body;
    if (!name?.trim()) {
        (0, response_1.sendError)(res, 'Name is required.', 'ValidationError', 400);
        return;
    }
    if (!email?.trim() || !email.includes('@')) {
        (0, response_1.sendError)(res, 'A valid email address is required.', 'ValidationError', 400);
        return;
    }
    if (!message?.trim() || message.trim().length < 10) {
        (0, response_1.sendError)(res, 'Message must be at least 10 characters long.', 'ValidationError', 400);
        return;
    }
    try {
        // 1. Save the inquiry to DB first — always
        const inquiry = await CustomerInquiry_1.CustomerInquiry.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || '',
            company: company?.trim() || '',
            product: product?.trim() || 'General',
            message: message.trim(),
            emailStatus: 'sent', // optimistic; will be corrected below if failed
        });
        // 2. Asynchronously attempt email notification to admin
        const emailSent = await (0, emailService_1.sendCustomerInquiryNotification)({
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone,
            company: inquiry.company,
            product: inquiry.product,
            message: inquiry.message,
            createdAt: inquiry.createdAt,
        });
        if (!emailSent) {
            inquiry.emailStatus = 'failed';
            inquiry.emailError = 'SMTP dispatch failed — admin notification not sent.';
            await inquiry.save();
            logger_1.default.warn(`[InquiryController] Admin email notification failed for inquiry: ${inquiry._id}`);
        }
        else {
            logger_1.default.info(`[InquiryController] Inquiry ${inquiry._id} saved and admin notified.`);
        }
        (0, response_1.sendSuccess)(res, "Your message has been received. We'll get back to you within one business day.", { id: inquiry._id, emailNotified: emailSent }, 201);
    }
    catch (error) {
        logger_1.default.error('[InquiryController] Create inquiry failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to submit inquiry. Please try again.', error.message, 500);
    }
};
exports.createInquiry = createInquiry;
/**
 * Get all customer inquiries (Admin only)
 * GET /api/inquiries
 */
const getInquiries = async (req, res) => {
    try {
        const { status, limit = '50', page = '1' } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, parseInt(limit, 10));
        const skip = (pageNum - 1) * limitNum;
        const [inquiries, total] = await Promise.all([
            CustomerInquiry_1.CustomerInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            CustomerInquiry_1.CustomerInquiry.countDocuments(filter),
        ]);
        (0, response_1.sendSuccess)(res, 'Inquiries retrieved successfully.', {
            inquiries,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    }
    catch (error) {
        logger_1.default.error('[InquiryController] Get inquiries failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to retrieve inquiries.', error.message, 500);
    }
};
exports.getInquiries = getInquiries;
/**
 * Update inquiry status (Admin only)
 * PUT /api/inquiries/:id/status
 */
const updateInquiryStatus = async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['New', 'In_Review', 'Contacted', 'Resolved'];
    if (!status || !validStatuses.includes(status)) {
        (0, response_1.sendError)(res, `Status must be one of: ${validStatuses.join(', ')}.`, 'ValidationError', 400);
        return;
    }
    try {
        const inquiry = await CustomerInquiry_1.CustomerInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!inquiry) {
            (0, response_1.sendError)(res, 'Inquiry not found.', 'NotFoundError', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, 'Inquiry status updated.', { inquiry });
    }
    catch (error) {
        logger_1.default.error('[InquiryController] Update inquiry status failed:', error.message);
        (0, response_1.sendError)(res, 'Failed to update inquiry status.', error.message, 500);
    }
};
exports.updateInquiryStatus = updateInquiryStatus;
