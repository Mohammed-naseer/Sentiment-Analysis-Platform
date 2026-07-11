"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/dashboard - Fetch dashboard charts and aggregation stats
router.get('/', auth_1.verifyToken, dashboardController_1.getStats);
exports.default = router;
