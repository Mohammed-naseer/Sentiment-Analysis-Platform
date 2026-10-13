"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIHealth = void 0;
const aiHealthService_1 = require("../services/aiHealthService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * GET /api/health/ai
 * Admin-only: Returns real-time AI provider health.
 * Never exposes API keys.
 */
const getAIHealth = async (_req, res) => {
    try {
        const report = await (0, aiHealthService_1.runAIHealthCheck)();
        // Strip any sensitive info before sending
        const safeReport = {
            gemini: {
                configured: report.gemini.configured,
                status: report.gemini.status,
                model: report.gemini.model,
                responseReceived: report.gemini.responseReceived ?? false,
                errorCode: report.gemini.errorCode,
                latencyMs: report.gemini.latencyMs,
            },
            groq: {
                configured: report.groq.configured,
                status: report.groq.status,
                model: report.groq.model,
                responseReceived: report.groq.responseReceived ?? false,
                errorCode: report.groq.errorCode,
                latencyMs: report.groq.latencyMs,
            },
            huggingface: {
                configured: report.huggingface.configured,
                status: report.huggingface.status,
                model: report.huggingface.model,
                responseReceived: report.huggingface.responseReceived ?? false,
                errorCode: report.huggingface.errorCode,
                latencyMs: report.huggingface.latencyMs,
            },
            overall: report.overall,
            workingProviders: `${report.workingCount}/${report.totalCount}`,
            analysisQuality: report.workingCount === 3 ? 'FULL' : report.workingCount > 0 ? 'LIMITED' : 'UNAVAILABLE',
            checkedAt: report.checkedAt,
        };
        (0, response_1.sendSuccess)(res, 'AI provider health check complete.', safeReport);
    }
    catch (err) {
        logger_1.default.error('[HealthController] AI health check failed:', err.message);
        (0, response_1.sendError)(res, 'Failed to run AI health check.', err.message, 500);
    }
};
exports.getAIHealth = getAIHealth;
