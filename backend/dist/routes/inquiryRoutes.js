"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inquiryController_1 = require("../controllers/inquiryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public: anyone can submit an inquiry
router.post('/', inquiryController_1.createInquiry);
// Admin-only: read and manage inquiries
router.get('/', auth_1.verifyToken, auth_1.verifyAdmin, inquiryController_1.getInquiries);
router.put('/:id/status', auth_1.verifyToken, auth_1.verifyAdmin, inquiryController_1.updateInquiryStatus);
exports.default = router;
