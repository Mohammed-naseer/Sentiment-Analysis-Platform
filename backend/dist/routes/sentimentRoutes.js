"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sentimentController_1 = require("../controllers/sentimentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// POST /api/sentiment/analyze - Run analysis on text inputs
router.post('/analyze', auth_1.verifyToken, validation_1.sentimentValidation, sentimentController_1.analyze);
exports.default = router;
