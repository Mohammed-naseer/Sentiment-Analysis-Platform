"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = void 0;
const analysisService_1 = require("../services/analysisService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Trigger parallel multi-model sentiment analysis
 * POST /api/sentiment/analyze
 */
const analyze = async (req, res) => {
    const { text } = req.body;
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        // Run multi-model analysis in parallel and save to database
        const savedRecord = await (0, analysisService_1.runMultiModelAnalysis)(user._id, text);
        // Format response matching requested schema
        const formattedData = {
            id: savedRecord._id,
            text: savedRecord.text,
            models: {
                gemini: savedRecord.gemini,
                groq: savedRecord.groq,
                huggingface: savedRecord.huggingface,
            },
            finalResult: {
                sentiment: savedRecord.finalSentiment,
                agreementPercentage: savedRecord.agreementPercentage,
                mostConfidentModel: savedRecord.mostConfidentModel,
            },
            createdAt: savedRecord.createdAt,
        };
        (0, response_1.sendSuccess)(res, 'Sentiment analysis complete.', formattedData);
    }
    catch (error) {
        logger_1.default.error('[SentimentController] Error running analysis:', error.message);
        (0, response_1.sendError)(res, 'Sentiment analysis failed.', error.message || error, 500);
    }
};
exports.analyze = analyze;
