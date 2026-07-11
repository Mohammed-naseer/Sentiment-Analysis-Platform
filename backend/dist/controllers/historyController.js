"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHistoryItem = exports.getHistory = void 0;
const Analysis_1 = require("../models/Analysis");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Retrieve sentiment analysis history for authenticated user
 * GET /api/history
 */
const getHistory = async (req, res) => {
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        const history = await Analysis_1.Analysis.find({ userId: user._id })
            .sort({ createdAt: -1 });
        (0, response_1.sendSuccess)(res, 'History logs retrieved successfully.', history);
    }
    catch (error) {
        logger_1.default.error('[HistoryController] Failed to fetch history:', error.message);
        (0, response_1.sendError)(res, 'Failed to fetch history.', error.message || error, 500);
    }
};
exports.getHistory = getHistory;
/**
 * Delete a specific analysis record
 * DELETE /api/history/:id
 */
const deleteHistoryItem = async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        const record = await Analysis_1.Analysis.findOneAndDelete({ _id: id, userId: user._id });
        if (!record) {
            (0, response_1.sendError)(res, 'Analysis record not found or unauthorized.', 'NotFoundError', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, 'Analysis record deleted successfully.', { id });
    }
    catch (error) {
        logger_1.default.error('[HistoryController] Failed to delete history item:', error.message);
        (0, response_1.sendError)(res, 'Failed to delete record.', error.message || error, 500);
    }
};
exports.deleteHistoryItem = deleteHistoryItem;
