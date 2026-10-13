"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlAnalyze = exports.analyze = void 0;
const analysisService_1 = require("../services/analysisService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Trigger parallel multi-model sentiment analysis
 * POST /api/sentiment/analyze
 */
const analyze = async (req, res) => {
    const { text, product, category } = req.body;
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        (0, response_1.sendError)(res, 'Text is required for analysis.', 'ValidationError', 400);
        return;
    }
    try {
        // Run multi-model analysis in parallel and save to database
        const savedRecord = await (0, analysisService_1.runMultiModelAnalysis)(user._id, text, {
            product: product || 'General',
            category: category || 'General',
            analysisType: 'Single',
        });
        // Format response matching requested schema
        const formattedData = {
            id: savedRecord._id,
            analysisId: savedRecord.analysisId,
            text: savedRecord.text,
            inputHash: savedRecord.inputHash,
            models: {
                gemini: savedRecord.gemini,
                groq: savedRecord.groq,
                huggingface: savedRecord.huggingface,
            },
            finalResult: {
                sentiment: savedRecord.finalSentiment,
                confidence: savedRecord.sentimentConfidence,
                agreementPercentage: savedRecord.agreementPercentage,
                mostConfidentModel: savedRecord.mostConfidentModel,
                activeProvidersCount: savedRecord.activeProvidersCount,
                totalProvidersCount: savedRecord.totalProvidersCount,
            },
            aspects: savedRecord.aspectResults,
            createdAt: savedRecord.createdAt,
        };
        (0, response_1.sendSuccess)(res, 'Sentiment analysis complete.', formattedData);
    }
    catch (error) {
        // ─── Total provider failure → HTTP 503 ────────────────────────────────────
        if (error instanceof analysisService_1.AIServicesUnavailableError) {
            logger_1.default.error(`[SentimentController] All AI providers failed. Working: ${error.workingProviders}/${error.totalProviders}`);
            res.status(503).json({
                success: false,
                error: 'AI_SERVICES_UNAVAILABLE',
                message: 'All AI providers are currently unavailable. Please try again later.',
                workingProviders: error.workingProviders,
                totalProviders: error.totalProviders,
            });
            return;
        }
        logger_1.default.error('[SentimentController] Error running analysis:', error.message);
        (0, response_1.sendError)(res, 'Sentiment analysis failed.', error.message || error, 500);
    }
};
exports.analyze = analyze;
/**
 * Trigger Python Deep Learning (CNN / LSTM / RoBERTa / Ensemble) analysis
 * POST /api/sentiment/ml-analyze
 */
const mlAnalyze = async (req, res) => {
    const { text, model } = req.body;
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        (0, response_1.sendError)(res, 'Text is required for analysis.', 'ValidationError', 400);
        return;
    }
    try {
        const { analyzeWithPythonMl, predictWithPythonMl } = await Promise.resolve().then(() => __importStar(require('../services/pythonMlService')));
        const mlResult = model && model !== 'all'
            ? await predictWithPythonMl(text, model)
            : await analyzeWithPythonMl(text);
        (0, response_1.sendSuccess)(res, 'Python ML analysis complete.', mlResult);
    }
    catch (error) {
        logger_1.default.error('[SentimentController] Python ML service error:', error.message);
        (0, response_1.sendError)(res, `Python ML service unavailable: ${error.message}`, 'MLServiceError', 503);
    }
};
exports.mlAnalyze = mlAnalyze;
