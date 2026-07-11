"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithHuggingFace = void 0;
const huggingface_1 = require("../config/huggingface");
const geminiService_1 = require("./geminiService");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Analyze Sentiment using Hugging Face Inference API
 */
const analyzeWithHuggingFace = async (text) => {
    if (!huggingface_1.huggingFaceConfig.isInitialized) {
        logger_1.default.warn('[HuggingFaceService] Hugging Face key not initialized. Using fallback mock.');
        return (0, geminiService_1.getMockResult)(text, 'HuggingFace');
    }
    try {
        const url = `${huggingface_1.huggingFaceConfig.apiUrl}${huggingface_1.huggingFaceConfig.sentimentModel}`;
        // Call the inference API via standard fetch
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${huggingface_1.huggingFaceConfig.apiKey}`,
            },
            body: JSON.stringify({ inputs: text }),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HF API response status ${response.status}: ${errText}`);
        }
        const result = await response.json();
        // Hugging Face returns a nested list of classifications
        // Example: [[{ label: 'POSITIVE', score: 0.99 }, { label: 'NEGATIVE', score: 0.01 }]]
        if (Array.isArray(result) && result[0] && Array.isArray(result[0])) {
            const predictions = result[0];
            // Sort predictions by score descending (highest confidence first)
            predictions.sort((a, b) => b.score - a.score);
            const topPred = predictions[0];
            const rawLabel = String(topPred.label).toUpperCase();
            let sentiment = 'Neutral';
            if (rawLabel === 'POSITIVE' || rawLabel === 'LABEL_2' || rawLabel.includes('POS')) {
                sentiment = 'Positive';
            }
            else if (rawLabel === 'NEGATIVE' || rawLabel === 'LABEL_0' || rawLabel.includes('NEG')) {
                sentiment = 'Negative';
            }
            else if (rawLabel === 'NEUTRAL' || rawLabel === 'LABEL_1' || rawLabel.includes('NEU')) {
                sentiment = 'Neutral';
            }
            // Convert score to 0-100 confidence percentage
            const confidence = Math.min(100, Math.max(0, Math.round(topPred.score * 100)));
            const emotion = sentiment === 'Positive' ? 'Happy' : sentiment === 'Negative' ? 'Concerned' : 'Neutral';
            return {
                sentiment,
                confidence,
                emotion,
                summary: `Hugging Face model ${huggingface_1.huggingFaceConfig.sentimentModel} predicted ${sentiment.toLowerCase()} with ${confidence}% confidence.`,
            };
        }
        throw new Error('Unexpected response format from Hugging Face Inference API.');
    }
    catch (error) {
        logger_1.default.error('[HuggingFaceService] Error calling Hugging Face:', error.message);
        return (0, geminiService_1.getMockResult)(text, 'HuggingFace');
    }
};
exports.analyzeWithHuggingFace = analyzeWithHuggingFace;
