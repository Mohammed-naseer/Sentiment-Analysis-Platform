"use strict";
/**
 * Hugging Face Sentiment Service
 * ─────────────────────────────────────────────────────────────
 * Uses @huggingface/inference InferenceClient with provider:"auto".
 * Detailed error categorization — no token ever logged.
 *
 * Supported error codes:
 *   NETWORK_ERROR | AUTHENTICATION_ERROR | MODEL_NOT_FOUND |
 *   RATE_LIMIT | QUOTA_EXCEEDED | TIMEOUT | INVALID_REQUEST | UNKNOWN_ERROR
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithHuggingFace = void 0;
const huggingface_1 = require("../config/huggingface");
const logger_1 = __importDefault(require("../utils/logger"));
const HF_TIMEOUT_MS = 20_000;
/** Map a raw HF label to our standard sentiment values */
function mapLabel(raw) {
    const upper = raw.toUpperCase();
    if (upper.includes('POS') || upper === 'LABEL_2')
        return 'Positive';
    if (upper.includes('NEG') || upper === 'LABEL_0')
        return 'Negative';
    return 'Neutral';
}
/** Classify an error into one of the standard error codes */
function classifyError(err) {
    const msg = (err?.message || err?.toString() || '').toLowerCase();
    const status = err?.status || err?.statusCode || 0;
    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('invalid token')) {
        return 'AUTHENTICATION_ERROR';
    }
    if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
        return 'RATE_LIMIT';
    }
    if (status === 402 || msg.includes('quota') || msg.includes('exceeded')) {
        return 'QUOTA_EXCEEDED';
    }
    if (status === 404 || msg.includes('not found') || msg.includes('does not exist')) {
        return 'MODEL_NOT_FOUND';
    }
    if (status === 503 || msg.includes('loading') || msg.includes('currently loading')) {
        return 'MODEL_NOT_FOUND'; // model is cold, treat as unavailable
    }
    if (status === 400 || msg.includes('invalid request') || msg.includes('bad request')) {
        return 'INVALID_REQUEST';
    }
    if (msg.includes('timed out') || msg.includes('timeout') || err?.name === 'AbortError') {
        return 'TIMEOUT';
    }
    if (msg.includes('fetch failed') ||
        msg.includes('econnrefused') ||
        msg.includes('network') ||
        msg.includes('enotfound') ||
        msg.includes('socket') ||
        err?.name === 'TypeError') {
        return 'NETWORK_ERROR';
    }
    return 'UNKNOWN_ERROR';
}
function logDiagnostics(errorCode, err) {
    // Safe diagnostics — NO token, NO auth header
    logger_1.default.warn('[HuggingFaceService] Request failed', {
        provider: 'HuggingFace',
        endpoint: 'api-inference.huggingface.co',
        model: huggingface_1.huggingFaceConfig.hfModel,
        timeoutMs: HF_TIMEOUT_MS,
        errorCode,
        errorName: err?.name || 'Error',
        errorMessage: (err?.message || '').slice(0, 200),
        httpStatus: err?.status || err?.statusCode || 'N/A',
    });
}
const analyzeWithHuggingFace = async (text, requestId) => {
    const startTime = Date.now();
    const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!huggingface_1.huggingFaceConfig.isInitialized || !huggingface_1.huggingFaceConfig.client) {
        logger_1.default.warn('[HuggingFaceService] InferenceClient not initialized — returning failure marker.');
        return failResult('CLIENT_NOT_INITIALIZED', reqId, startTime);
    }
    const model = huggingface_1.huggingFaceConfig.hfModel;
    try {
        const safeInput = text.length > 1500 ? text.slice(0, 1500) : text;
        const rawResult = await Promise.race([
            huggingface_1.huggingFaceConfig.client.textClassification({
                model,
                inputs: safeInput,
                provider: 'auto',
            }),
            new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timed out'), { name: 'AbortError' })), HF_TIMEOUT_MS)),
        ]);
        const latencyMs = Date.now() - startTime;
        const predictions = Array.isArray(rawResult) ? rawResult : [rawResult];
        if (!predictions.length)
            throw new Error('Empty predictions array from HF API');
        predictions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const top = predictions[0];
        const sentiment = mapLabel(top.label);
        const confidence = Math.min(100, Math.max(0, Math.round((top.score ?? 0) * 100)));
        const emotion = sentiment === 'Positive' ? 'Happy' : sentiment === 'Negative' ? 'Concerned' : 'Neutral';
        logger_1.default.info('[HuggingFaceService] Structured Provider Log:', {
            provider: 'HuggingFace',
            requestId: reqId,
            status: 'success',
            latency: `${latencyMs}ms`,
            model,
            sentiment,
            confidence,
            timestamp: new Date().toISOString(),
        });
        return {
            sentiment,
            confidence,
            emotion,
            emotionConfidence: confidence,
            summary: `Hugging Face (${model}) predicted ${sentiment.toLowerCase()} with ${confidence}% confidence.`,
            status: 'success',
            latencyMs,
            model,
        };
    }
    catch (err) {
        const errorCode = classifyError(err);
        logDiagnostics(errorCode, err);
        return failResult(errorCode, reqId, startTime, model);
    }
};
exports.analyzeWithHuggingFace = analyzeWithHuggingFace;
function failResult(reason, _requestId, startTime, model) {
    const latencyMs = startTime ? Date.now() - startTime : 0;
    return {
        sentiment: 'Neutral',
        confidence: 0,
        emotion: 'Unknown',
        summary: `[Fallback] HuggingFace failed: ${reason}`,
        status: 'failed',
        errorCode: reason,
        errorMessage: `HuggingFace failed: ${reason}`,
        latencyMs,
        model: model || huggingface_1.huggingFaceConfig.hfModel || 'unknown',
    };
}
