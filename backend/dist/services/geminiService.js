"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockResult = exports.analyzeWithGemini = exports.sanitizeSentiment = void 0;
const gemini_1 = require("../config/gemini");
const logger_1 = __importDefault(require("../utils/logger"));
const sanitizeSentiment = (val) => {
    const norm = String(val || '').trim().toLowerCase();
    if (norm.includes('mix'))
        return 'Mixed';
    if (norm.includes('pos'))
        return 'Positive';
    if (norm.includes('neg'))
        return 'Negative';
    return 'Neutral';
};
exports.sanitizeSentiment = sanitizeSentiment;
/**
 * Analyze Sentiment & Granular Aspects using Gemini API.
 */
const analyzeWithGemini = async (text, requestId) => {
    const startTime = Date.now();
    const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!gemini_1.isGeminiInitialized || !gemini_1.genAI) {
        logger_1.default.warn('[GeminiService] Gemini SDK not initialized.');
        return failResult('Gemini', 'SDK_NOT_INITIALIZED', 'SDK not initialized with valid API key', reqId, startTime);
    }
    let activeModel;
    try {
        activeModel = await gemini_1.resolvedGeminiModel;
    }
    catch (err) {
        logger_1.default.warn(`[GeminiService] No Gemini model available — ${err.message}`);
        return failResult('Gemini', 'NO_AVAILABLE_MODEL', err.message, reqId, startTime);
    }
    try {
        const prompt = `Analyze the sentiment, emotions, and specific product/service aspects in this customer review:

"${text.length > 8000 ? text.slice(0, 8000) : text}"

Return a single JSON object with this exact structure:
{
  "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "confidence": <integer 0 to 100 representing certainty percentage>,
  "emotion": "<primary emotion word, e.g. Frustrated, Happy, Satisfied, Concerned, Anger, Disappointment, Excited, Neutral>",
  "emotionConfidence": <integer 0 to 100 representing emotional signal certainty>,
  "summary": "<concise 1-sentence explanation of why that sentiment/emotion was chosen>",
  "aspects": [
    {
      "aspect": "<Aspect name, e.g. Design, Display, Camera, Battery, Heating, Software, Support, Delivery, Packaging, Build Quality>",
      "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "confidence": <float 0.0 to 1.0>,
      "evidence": "<exact verbatim quote from text supporting this aspect>"
    }
  ]
}
If a review contains both substantial positive points and negative issues, set sentiment to "Mixed".
Do NOT return markdown fences or other text. Return raw JSON only.`;
        const response = await gemini_1.genAI.models.generateContent({
            model: activeModel,
            contents: prompt,
        });
        const latencyMs = Date.now() - startTime;
        const responseText = response.text;
        if (!responseText)
            throw new Error('Empty response from Gemini API.');
        // Clean JSON response
        const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        const result = {
            sentiment: (0, exports.sanitizeSentiment)(parsed.sentiment),
            confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.confidence))) : 75,
            emotion: parsed.emotion || 'Neutral',
            emotionConfidence: typeof parsed.emotionConfidence === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.emotionConfidence))) : 80,
            summary: parsed.summary || `Gemini (${activeModel}) analyzed the review.`,
            aspects: Array.isArray(parsed.aspects) ? parsed.aspects.map((a) => ({
                aspect: String(a.aspect || 'General'),
                sentiment: String(a.sentiment || 'NEUTRAL').toUpperCase(),
                confidence: typeof a.confidence === 'number' ? Math.min(1, Math.max(0, a.confidence)) : 0.8,
                evidence: String(a.evidence || ''),
            })) : [],
            status: 'success',
            latencyMs,
            model: activeModel,
        };
        logger_1.default.info('[GeminiService] Structured Provider Log:', {
            provider: 'Gemini',
            requestId: reqId,
            status: 'success',
            latency: `${latencyMs}ms`,
            model: activeModel,
            sentiment: result.sentiment,
            confidence: result.confidence,
            timestamp: new Date().toISOString(),
        });
        return result;
    }
    catch (error) {
        logger_1.default.error(`[GeminiService] Error calling Gemini (${activeModel}):`, error.message);
        return failResult('Gemini', 'PROVIDER_ERROR', error.message, reqId, startTime, activeModel);
    }
};
exports.analyzeWithGemini = analyzeWithGemini;
const getMockResult = (_text, provider) => {
    return failResult(provider, 'UNAVAILABLE', `${provider} is temporarily unavailable`, 'mock_id', Date.now());
};
exports.getMockResult = getMockResult;
function failResult(provider, errorCode, rawReason, requestId, startTime, model) {
    const latencyMs = Date.now() - startTime;
    // Clean message: never leak keys or auth tokens
    let safeReason = rawReason || 'Provider failed to respond';
    if (safeReason.includes('API key') || safeReason.includes('auth')) {
        safeReason = 'Authentication credentials rejected by provider';
    }
    else if (safeReason.includes('404') || safeReason.includes('not found')) {
        safeReason = 'Configured AI model endpoint is not found or unsupported';
    }
    else if (safeReason.includes('429') || safeReason.includes('quota')) {
        safeReason = 'Provider rate limit or quota exceeded';
    }
    logger_1.default.warn('[GeminiService] Structured Provider Failure Log:', {
        provider,
        requestId,
        status: 'failed',
        latency: `${latencyMs}ms`,
        errorCode,
        errorMessage: safeReason,
        model: model || 'unknown',
        timestamp: new Date().toISOString(),
    });
    return {
        sentiment: 'Neutral',
        confidence: 0,
        emotion: 'Unknown',
        summary: `[Fallback] ${provider} failed: ${safeReason}`,
        status: 'failed',
        errorCode,
        errorMessage: safeReason,
        latencyMs,
        model: model || 'unknown',
    };
}
