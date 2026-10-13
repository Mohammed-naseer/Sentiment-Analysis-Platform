import { Request, Response } from 'express';
import { CustomerInquiry } from '../models/CustomerInquiry';
import { sendCustomerInquiryNotification } from '../services/emailService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Submit a new customer inquiry (public — no auth required)
 * POST /api/inquiries
 */
export const createInquiry = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, company, product, message } = req.body;

  if (!name?.trim()) {
    sendError(res, 'Name is required.', 'ValidationError', 400);
    return;
  }
  if (!email?.trim() || !email.includes('@')) {
    sendError(res, 'A valid email address is required.', 'ValidationError', 400);
    return;
  }
  if (!message?.trim() || message.trim().length < 10) {
    sendError(res, 'Message must be at least 10 characters long.', 'ValidationError', 400);
    return;
  }

  try {
    // 1. Save the inquiry to DB first — always
    const inquiry = await CustomerInquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || '',
      company: company?.trim() || '',
      product: product?.trim() || 'General',
      message: message.trim(),
      emailStatus: 'sent', // optimistic; will be corrected below if failed
    });

    // 2. Asynchronously attempt email notification to admin
    const emailSent = await sendCustomerInquiryNotification({
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
      logger.warn(`[InquiryController] Admin email notification failed for inquiry: ${inquiry._id}`);
    } else {
      logger.info(`[InquiryController] Inquiry ${inquiry._id} saved and admin notified.`);
    }

    sendSuccess(
      res,
      "Your message has been received. We'll get back to you within one business day.",
      { id: inquiry._id, emailNotified: emailSent },
      201
    );
  } catch (error: any) {
    logger.error('[InquiryController] Create inquiry failed:', error.message);
    sendError(res, 'Failed to submit inquiry. Please try again.', error.message, 500);
  }
};

/**
 * Get all customer inquiries (Admin only)
 * GET /api/inquiries
 */
export const getInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = '50', page = '1' } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [inquiries, total] = await Promise.all([
      CustomerInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      CustomerInquiry.countDocuments(filter),
    ]);

    sendSuccess(res, 'Inquiries retrieved successfully.', {
      inquiries,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error('[InquiryController] Get inquiries failed:', error.message);
    sendError(res, 'Failed to retrieve inquiries.', error.message, 500);
  }
};

/**
 * Update inquiry status (Admin only)
 * PUT /api/inquiries/:id/status
 */
export const updateInquiryStatus = async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const validStatuses = ['New', 'In_Review', 'Contacted', 'Resolved'];

  if (!status || !validStatuses.includes(status)) {
    sendError(res, `Status must be one of: ${validStatuses.join(', ')}.`, 'ValidationError', 400);
    return;
  }

  try {
    const inquiry = await CustomerInquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!inquiry) {
      sendError(res, 'Inquiry not found.', 'NotFoundError', 404);
      return;
    }

    sendSuccess(res, 'Inquiry status updated.', { inquiry });
  } catch (error: any) {
    logger.error('[InquiryController] Update inquiry status failed:', error.message);
    sendError(res, 'Failed to update inquiry status.', error.message, 500);
  }
};
