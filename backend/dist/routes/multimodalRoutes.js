"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const multimodalController_1 = require("../controllers/multimodalController");
const router = (0, express_1.Router)();
// Protect multimodal route with authentication
router.use(auth_1.verifyToken);
// POST /api/multimodal/analyze — Text & Voice Emotion Analysis
router.post('/analyze', multimodalController_1.analyzeMultimodal);
exports.default = router;
