"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const historyController_1 = require("../controllers/historyController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// GET /api/history - Retrieve list of past analyses
router.get('/', auth_1.verifyToken, historyController_1.getHistory);
// DELETE /api/history/:id - Delete analysis log
router.delete('/:id', auth_1.verifyToken, validation_1.deleteHistoryValidation, historyController_1.deleteHistoryItem);
exports.default = router;
