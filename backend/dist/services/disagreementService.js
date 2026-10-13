"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveModelConsensus = void 0;
const geminiService_1 = require("./geminiService");
const logger_1 = __importDefault(require("../utils/logger"));
const resolveModelConsensus = async (text, gemini, groq, hf) => {
    const S_gemini = gemini.sentiment;
    const S_groq = groq.sentiment;
    const S_hf = hf.sentiment;
    if (S_gemini === S_groq && S_groq === S_hf) {
        return {
            finalSentiment: S_gemini,
            confidence: Math.round((gemini.confidence + groq.confidence + hf.confidence) / 3),
            agreementPercentage: 100,
            isDisagreement: false,
        };
    }
    if ((S_gemini === S_groq && S_groq !== S_hf) || (S_gemini === S_hf && S_gemini !== S_groq)) {
        return {
            finalSentiment: S_gemini,
            confidence: Math.round((gemini.confidence + groq.confidence) / 2),
            agreementPercentage: 66,
            isDisagreement: false,
        };
    }
    if (S_groq === S_hf && S_groq !== S_gemini) {
        return {
            finalSentiment: S_groq,
            confidence: Math.round((groq.confidence + hf.confidence) / 2),
            agreementPercentage: 66,
            isDisagreement: false,
        };
    }
    // 33% Agreement - Complete Disagreement between Gemini, Groq, and Hugging Face
    logger_1.default.info(`[DisagreementService] Model disagreement detected for text snippet: "${text.slice(0, 40)}..."`);
    // Perform Contextual AI Analysis for Disagreement Resolution
    let finalSentiment = 'Mixed';
    let disagreementReason = 'Models evaluated different linguistic elements: sarcasm, negation, or mixed aspect sentiment.';
    try {
        const prompt = `Perform a contextual tie-breaker analysis on this text where AI models disagreed:
Text: "${text}"
Gemini output: ${S_gemini} (Conf: ${gemini.confidence}%)
Groq output: ${S_groq} (Conf: ${groq.confidence}%)
HuggingFace output: ${S_hf} (Conf: ${hf.confidence}%)

Identify if there is sarcasm, negation, mixed sentiment (e.g. "great camera but awful battery"), or ambiguous context.
Respond with JSON strictly in format:
{
  "finalSentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "reason": "Brief explanation of why models disagreed and final ruling"
}`;
        const aiRes = await (0, geminiService_1.analyzeWithGemini)(prompt);
        if (aiRes && aiRes.summary) {
            try {
                const jsonMatch = aiRes.summary.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.finalSentiment)
                        finalSentiment = parsed.finalSentiment;
                    if (parsed.reason)
                        disagreementReason = parsed.reason;
                }
            }
            catch {
                disagreementReason = aiRes.summary;
            }
        }
    }
    catch (err) {
        logger_1.default.warn('[DisagreementService] AI tie-breaker error, falling back to confidence weighting:', err.message);
        const maxConf = Math.max(gemini.confidence, groq.confidence, hf.confidence);
        if (maxConf === gemini.confidence)
            finalSentiment = S_gemini;
        else if (maxConf === groq.confidence)
            finalSentiment = S_groq;
        else
            finalSentiment = S_hf;
    }
    return {
        finalSentiment,
        confidence: Math.max(gemini.confidence, groq.confidence, hf.confidence),
        agreementPercentage: 33,
        isDisagreement: true,
        disagreementReason,
    };
};
exports.resolveModelConsensus = resolveModelConsensus;
