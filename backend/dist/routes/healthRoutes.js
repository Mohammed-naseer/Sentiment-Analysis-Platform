"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthController_1 = require("../controllers/healthController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/health — Public endpoint for liveness/readiness checks
router.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        service: 'AI Sentiment Analysis Backend',
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});
// GET /api/health/ai — Admin-only AI provider health check
router.get('/ai', auth_1.verifyToken, auth_1.verifyAdmin, healthController_1.getAIHealth);
exports.default = router;
