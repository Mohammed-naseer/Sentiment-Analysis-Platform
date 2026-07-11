"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = void 0;
const Analysis_1 = require("../models/Analysis");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Retrieve aggregated dashboard statistics and chart-ready analytics data
 * GET /api/dashboard
 */
const getStats = async (req, res) => {
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        const records = await Analysis_1.Analysis.find({ userId: user._id });
        // 1. Basic counts
        const totalAnalyses = records.length;
        let positive = 0;
        let negative = 0;
        let neutral = 0;
        let totalConfidenceSum = 0;
        let totalAgreementSum = 0;
        // Counts for most confident model
        let geminiConfCount = 0;
        let groqConfCount = 0;
        let hfConfCount = 0;
        // 2. Loop and sum properties
        records.forEach(r => {
            if (r.finalSentiment === 'Positive')
                positive++;
            else if (r.finalSentiment === 'Negative')
                negative++;
            else
                neutral++;
            // Average confidence of the three models on this execution
            const recordAvgConf = (r.gemini.confidence + r.groq.confidence + r.huggingface.confidence) / 3;
            totalConfidenceSum += recordAvgConf;
            // Agreement percentage sum
            totalAgreementSum += r.agreementPercentage;
            // Most confident tracker
            if (r.mostConfidentModel === 'Gemini')
                geminiConfCount++;
            else if (r.mostConfidentModel === 'Groq')
                groqConfCount++;
            else
                hfConfCount++;
        });
        const averageConfidence = totalAnalyses > 0 ? Math.round(totalConfidenceSum / totalAnalyses) : 0;
        const averageAgreement = totalAnalyses > 0 ? Math.round(totalAgreementSum / totalAnalyses) : 0;
        // Determine the model chosen most frequently as the most confident
        let mostUsedModel = 'Gemini';
        const maxConfCount = Math.max(geminiConfCount, groqConfCount, hfConfCount);
        if (totalAnalyses > 0) {
            if (maxConfCount === geminiConfCount)
                mostUsedModel = 'Gemini';
            else if (maxConfCount === groqConfCount)
                mostUsedModel = 'Groq';
            else
                mostUsedModel = 'HuggingFace';
        }
        // 3. Time Series Cohorts (Weekly & Monthly Statistics)
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        // Generate last 7 days labels & initial data
        const weeklyStats = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * oneDayMs);
            const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            weeklyStats.push({ date: dateString, positive: 0, neutral: 0, negative: 0, total: 0 });
        }
        // Generate last 30 days labels & initial data
        const monthlyStats = [];
        for (let i = 29; i >= 0; i -= 2) { // group in 2-day steps to keep chart clear
            const d = new Date(now.getTime() - i * oneDayMs);
            const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            monthlyStats.push({ date: dateString, positive: 0, neutral: 0, negative: 0, total: 0 });
        }
        // Distribute records to weekly/monthly cohorts
        records.forEach(r => {
            const recordDate = new Date(r.createdAt);
            const diffMs = now.getTime() - recordDate.getTime();
            const diffDays = Math.floor(diffMs / oneDayMs);
            // Check for weekly bucket (0 to 6 days ago)
            if (diffDays >= 0 && diffDays < 7) {
                const index = 6 - diffDays;
                if (weeklyStats[index]) {
                    weeklyStats[index].total++;
                    if (r.finalSentiment === 'Positive')
                        weeklyStats[index].positive++;
                    else if (r.finalSentiment === 'Negative')
                        weeklyStats[index].negative++;
                    else
                        weeklyStats[index].neutral++;
                }
            }
            // Check for monthly bucket (0 to 29 days ago)
            if (diffDays >= 0 && diffDays < 30) {
                // Find closest 2-day step
                const index = 14 - Math.floor(diffDays / 2);
                if (monthlyStats[index]) {
                    monthlyStats[index].total++;
                    if (r.finalSentiment === 'Positive')
                        monthlyStats[index].positive++;
                    else if (r.finalSentiment === 'Negative')
                        monthlyStats[index].negative++;
                    else
                        monthlyStats[index].neutral++;
                }
            }
        });
        // 4. Agreement Distribution Analytics
        const agreementDistribution = {
            agreement100: records.filter(r => r.agreementPercentage === 100).length,
            agreement66: records.filter(r => r.agreementPercentage === 66).length,
            agreement33: records.filter(r => r.agreementPercentage === 33).length,
        };
        // 5. Avg confidence per provider
        let geminiAvgConf = 0;
        let groqAvgConf = 0;
        let hfAvgConf = 0;
        if (totalAnalyses > 0) {
            geminiAvgConf = Math.round(records.reduce((sum, r) => sum + r.gemini.confidence, 0) / totalAnalyses);
            groqAvgConf = Math.round(records.reduce((sum, r) => sum + r.groq.confidence, 0) / totalAnalyses);
            hfAvgConf = Math.round(records.reduce((sum, r) => sum + r.huggingface.confidence, 0) / totalAnalyses);
        }
        const payload = {
            summary: {
                totalAnalyses,
                positiveCount: positive,
                negativeCount: negative,
                neutralCount: neutral,
                averageConfidence,
                averageAgreement,
                mostUsedModel,
            },
            weeklyStatistics: weeklyStats,
            monthlyStatistics: monthlyStats,
            agreementDistribution,
            providerMetrics: {
                gemini: { averageConfidence: geminiAvgConf, count: geminiConfCount },
                groq: { averageConfidence: groqAvgConf, count: groqConfCount },
                huggingface: { averageConfidence: hfAvgConf, count: hfConfCount }
            }
        };
        (0, response_1.sendSuccess)(res, 'Dashboard statistics retrieved successfully.', payload);
    }
    catch (error) {
        logger_1.default.error('[DashboardController] Failed to compile stats:', error.message);
        (0, response_1.sendError)(res, 'Failed to fetch dashboard statistics.', error.message || error, 500);
    }
};
exports.getStats = getStats;
