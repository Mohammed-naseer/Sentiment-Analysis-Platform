import { Router } from 'express';
import { createInquiry, getInquiries, updateInquiryStatus } from '../controllers/inquiryController';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = Router();

// Public: anyone can submit an inquiry
router.post('/', createInquiry);

// Admin-only: read and manage inquiries
router.get('/', verifyToken, verifyAdmin, getInquiries);
router.put('/:id/status', verifyToken, verifyAdmin, updateInquiryStatus);

export default router;
