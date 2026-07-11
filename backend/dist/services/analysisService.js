"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMultiModelAnalysis = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Analysis_1 = require("../models/Analysis");
const geminiService_1 = require("./geminiService");
const groqService_1 = require("./groqService");
const huggingfaceService_1 = require("./huggingfaceService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Runs sentiment analysis on all three AI models in parallel,
 * compares the results, calculates agreement metrics, and saves the record in MongoDB.
 */
const runMultiModelAnalysis = async (userId, text) => {
    logger_1.default.info(`[AnalysisService] Starting parallel multi-model sentiment analysis for user: ${userId}`);
    // 1. Run all three analysis tasks in parallel using Promise.all
    const [geminiResult, groqResult, hfResult] = await Promise.all([
        (0, geminiService_1.analyzeWithGemini)(text),
        (0, groqService_1.analyzeWithGroq)(text),
        (0, huggingfaceService_1.analyzeWithHuggingFace)(text),
    ]);
    logger_1.default.debug('[AnalysisService] AI responses received:', {
        gemini: geminiResult.sentiment,
        groq: groqResult.sentiment,
        huggingface: hfResult.sentiment,
    });
    // 2. Perform comparison and agreement logic
    const S_gemini = geminiResult.sentiment;
    const S_groq = groqResult.sentiment;
    const S_hf = hfResult.sentiment;
    let finalSentiment;
    let agreementPercentage;
    if (S_gemini === S_groq && S_groq === S_hf) {
        // 100% agreement - all three models returned the same sentiment
        finalSentiment = S_gemini;
        agreementPercentage = 100;
    }
    else if (S_gemini === S_groq || S_gemini === S_hf) {
        // 66% agreement - Gemini agrees with Groq or Hugging Face
        finalSentiment = S_gemini;
        agreementPercentage = 66;
    }
    else if (S_groq === S_hf) {
        // 66% agreement - Groq agrees with Hugging Face
        finalSentiment = S_groq;
        agreementPercentage = 66;
    }
    else {
        // 33% agreement - all three models disagreed (Positive, Negative, Neutral)
        // Tie-breaker: Select the sentiment of the model that had the highest confidence
        agreementPercentage = 33;
        const maxConfidence = Math.max(geminiResult.confidence, groqResult.confidence, hfResult.confidence);
        if (maxConfidence === geminiResult.confidence) {
            finalSentiment = S_gemini;
        }
        else if (maxConfidence === groqResult.confidence) {
            finalSentiment = S_groq;
        }
        else {
            finalSentiment = S_hf;
        }
    }
    // 3. Determine the Most Confident Model
    let mostConfidentModel = 'Gemini';
    const maxConf = Math.max(geminiResult.confidence, groqResult.confidence, hfResult.confidence);
    if (maxConf === geminiResult.confidence) {
        mostConfidentModel = 'Gemini';
    }
    else if (maxConf === groqResult.confidence) {
        mostConfidentModel = 'Groq';
    }
    else {
        mostConfidentModel = 'HuggingFace';
    }
    // 4. Save analysis details to MongoDB Atlas Database
    const analysisDoc = new Analysis_1.Analysis({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        text,
        gemini: geminiResult,
        groq: groqResult,
        huggingface: hfResult,
        finalSentiment,
        agreementPercentage,
        mostConfidentModel,
    });
    await analysisDoc.save();
    logger_1.default.info(`[AnalysisService] Multi-model analysis saved. ID: ${analysisDoc._id}`);
    return analysisDoc;
};
exports.runMultiModelAnalysis = runMultiModelAnalysis;
