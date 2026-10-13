"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const visionController_1 = require("../controllers/visionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 1. Standalone image analysis (supports optional auth)
router.post('/analyze', visionController_1.visionUploadMiddleware, visionController_1.analyzeImageOnly);
// 2. Multimodal review analysis (text + optional image)
router.post('/multimodal', auth_1.verifyToken, visionController_1.visionUploadMiddleware, visionController_1.analyzeMultimodalCombined);
// 3. Human-in-the-loop feedback submission
router.post('/feedback', auth_1.verifyToken, visionController_1.recordVisionFeedback);
// 4. Vision intelligence summary metrics for dashboards
router.get('/stats', auth_1.verifyToken, visionController_1.getVisionStats);
exports.default = router;
