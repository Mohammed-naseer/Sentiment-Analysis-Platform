"use strict";
/**
 * AI Health Service
 * ─────────────────────────────────────────────────────────────
 * Performs REAL lightweight authenticated requests to each AI
 * provider. Never falls back to mock results.
 *
 * Error codes returned (no API keys are ever exposed):
 *   MISSING_API_KEY | INVALID_API_KEY | AUTHENTICATION_ERROR |
 *   MODEL_NOT_FOUND | RATE_LIMIT | QUOTA_EXCEEDED |
 *   INVALID_REQUEST | NETWORK_ERROR | TIMEOUT | UNKNOWN_ERROR
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAIHealthCheck = runAIHealthCheck;
exports.logStartupAIHealth = logStartupAIHealth;
const gemini_1 = require("../config/gemini");
const groq_1 = require("../config/groq");
const huggingface_1 = require("../config/huggingface");
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
const TEST_TEXT = 'This is a quick API connectivity test.';
// ─── Gemini ────────────────────────────────────────────────────────────────────
async function checkGemini() {
    const configured = !!(env_1.config.geminiApiKey && env_1.config.geminiApiKey !== 'mock-or-replace-with-real-key');
    if (!configured) {
        return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
    }
    if (!gemini_1.isGeminiInitialized || !gemini_1.genAI) {
        return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'SDK failed to initialize' };
    }
    // Await the auto-discovered model
    let model;
    try {
        model = await Promise.race([
            gemini_1.resolvedGeminiModel,
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30_000)),
        ]);
    }
    catch (err) {
        const msg = err?.message || '';
        logger_1.default.warn(`[AIHealth] Gemini model discovery failed: ${msg}`);
        return {
            configured: true,
            status: 'failed',
            errorCode: msg === 'TIMEOUT' ? 'TIMEOUT' : 'MODEL_NOT_FOUND',
            errorDetail: msg,
        };
    }
    const start = Date.now();
    try {
        const response = await Promise.race([
            gemini_1.genAI.models.generateContent({
                model,
                contents: `Respond with OK for connectivity test: "${TEST_TEXT}"`,
                config: { maxOutputTokens: 50 },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000)),
        ]);
        const text = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
        const isValidResponse = response && (typeof text === 'string' || response.candidates?.length > 0);
        if (!isValidResponse)
            throw new Error('EMPTY_RESPONSE');
        return { configured: true, status: 'working', model, responseReceived: true, latencyMs: Date.now() - start };
    }
    catch (err) {
        const latencyMs = Date.now() - start;
        const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
        let errorCode = 'UNKNOWN_ERROR';
        if (msg === 'TIMEOUT')
            errorCode = 'TIMEOUT';
        else if (msg.includes('API key') || msg.includes('401'))
            errorCode = 'INVALID_API_KEY';
        else if (msg.includes('403'))
            errorCode = 'AUTHENTICATION_ERROR';
        else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED'))
            errorCode = 'QUOTA_EXCEEDED';
        else if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available'))
            errorCode = 'MODEL_NOT_FOUND';
        else if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED'))
            errorCode = 'NETWORK_ERROR';
        logger_1.default.warn(`[AIHealth] Gemini check failed: ${errorCode} — ${msg.slice(0, 150)}`);
        return { configured: true, status: 'failed', model, responseReceived: false, errorCode, latencyMs };
    }
}
// ─── Groq ──────────────────────────────────────────────────────────────────────
async function checkGroq() {
    const configured = !!(env_1.config.groqApiKey && env_1.config.groqApiKey !== 'mock-or-replace-with-real-key');
    if (!configured) {
        return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
    }
    if (!groq_1.isGroqInitialized || !groq_1.groq) {
        return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'SDK failed to initialize' };
    }
    const model = env_1.config.groqModel;
    const start = Date.now();
    try {
        const response = await groq_1.groq.chat.completions.create({
            model,
            messages: [{ role: 'user', content: `Return JSON object {"ok":true}. Test: "${TEST_TEXT}"` }],
            response_format: { type: 'json_object' },
            max_tokens: 100,
            temperature: 0,
            stream: false,
        });
        const completed = await Promise.race([
            Promise.resolve(response),
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10_000)),
        ]);
        const text = completed.choices[0]?.message?.content;
        if (!text)
            throw new Error('EMPTY_RESPONSE');
        return { configured: true, status: 'working', model, responseReceived: true, latencyMs: Date.now() - start };
    }
    catch (err) {
        const latencyMs = Date.now() - start;
        const msg = err?.message || '';
        const statusCode = err?.status || err?.statusCode || 0;
        let errorCode = 'UNKNOWN_ERROR';
        if (msg === 'TIMEOUT')
            errorCode = 'TIMEOUT';
        else if (statusCode === 401 || msg.includes('Invalid API Key') || msg.includes('authentication'))
            errorCode = 'INVALID_API_KEY';
        else if (statusCode === 403)
            errorCode = 'AUTHENTICATION_ERROR';
        else if (statusCode === 429 || msg.includes('rate limit'))
            errorCode = 'RATE_LIMIT';
        else if (msg.includes('quota'))
            errorCode = 'QUOTA_EXCEEDED';
        else if (statusCode === 404 || msg.includes('model'))
            errorCode = 'MODEL_NOT_FOUND';
        else if (msg.includes('fetch') || msg.includes('ECONNREFUSED'))
            errorCode = 'NETWORK_ERROR';
        logger_1.default.warn(`[AIHealth] Groq check failed: ${errorCode} — ${msg}`);
        return { configured: true, status: 'failed', model, responseReceived: false, errorCode, latencyMs };
    }
}
// ─── Hugging Face ──────────────────────────────────────────────────────────────
async function checkHuggingFace() {
    const configured = !!(env_1.config.hfToken && env_1.config.hfToken !== 'mock-or-replace-with-real-key');
    if (!configured) {
        return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
    }
    if (!huggingface_1.huggingFaceConfig.isInitialized || !huggingface_1.huggingFaceConfig.client) {
        return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'InferenceClient not initialized' };
    }
    const model = huggingface_1.huggingFaceConfig.hfModel;
    const start = Date.now();
    try {
        const rawResult = await Promise.race([
            huggingface_1.huggingFaceConfig.client.textClassification({
                model,
                inputs: TEST_TEXT,
                provider: 'auto',
            }),
            new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('TIMEOUT'), { name: 'AbortError' })), 20_000)),
        ]);
        const latencyMs = Date.now() - start;
        const predictions = Array.isArray(rawResult) ? rawResult : [rawResult];
        if (!predictions.length)
            throw new Error('UNEXPECTED_RESPONSE_FORMAT');
        return { configured: true, status: 'working', model, responseReceived: true, latencyMs };
    }
    catch (err) {
        const latencyMs = Date.now() - start;
        const msg = (err?.message || '').toLowerCase();
        const status = err?.status || err?.statusCode || 0;
        let errorCode = 'UNKNOWN_ERROR';
        if (err?.name === 'AbortError' || msg.includes('timed out') || msg === 'timeout')
            errorCode = 'TIMEOUT';
        else if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('invalid token'))
            errorCode = 'AUTHENTICATION_ERROR';
        else if (status === 429 || msg.includes('rate limit'))
            errorCode = 'RATE_LIMIT';
        else if (status === 402 || msg.includes('quota'))
            errorCode = 'QUOTA_EXCEEDED';
        else if (status === 404 || msg.includes('not found') || status === 503 || msg.includes('loading'))
            errorCode = 'MODEL_NOT_FOUND';
        else if (status === 400 || msg.includes('invalid request'))
            errorCode = 'INVALID_REQUEST';
        else if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('network') || err?.name === 'TypeError')
            errorCode = 'NETWORK_ERROR';
        // Safe diagnostics — no token logged
        logger_1.default.warn(`[AIHealth] HuggingFace check failed: ${errorCode}`, {
            endpoint: 'api-inference.huggingface.co',
            model,
            httpStatus: status || 'N/A',
            errorName: err?.name,
            errorMessage: (err?.message || '').slice(0, 200),
        });
        return { configured: true, status: 'failed', model, responseReceived: false, errorCode, latencyMs };
    }
}
// ─── Main exported function ────────────────────────────────────────────────────
async function runAIHealthCheck() {
    logger_1.default.info('[AIHealth] Running AI provider health check…');
    const [gemini, groqResult, huggingface] = await Promise.all([
        checkGemini(),
        checkGroq(),
        checkHuggingFace(),
    ]);
    const workingCount = [gemini, groqResult, huggingface].filter(r => r.status === 'working').length;
    const totalCount = 3;
    const overall = workingCount === 3 ? 'healthy' : workingCount > 0 ? 'degraded' : 'unavailable';
    return {
        gemini,
        groq: groqResult,
        huggingface,
        workingCount,
        totalCount,
        overall,
        checkedAt: new Date().toISOString(),
    };
}
// ─── Startup health log ────────────────────────────────────────────────────────
async function logStartupAIHealth() {
    try {
        console.log('\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        console.log('\x1b[36m  AI Provider Health Check\x1b[0m');
        console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        const report = await runAIHealthCheck();
        const formatProvider = (name, result) => {
            const configStatus = result.configured ? '\x1b[32mCONFIGURED\x1b[0m' : '\x1b[31mMISSING\x1b[0m';
            if (result.status === 'working') {
                console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[32mWORKING\x1b[0m  (${result.latencyMs}ms)  Model: ${result.model}`);
            }
            else if (result.status === 'not_configured') {
                console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[31mSKIPPED\x1b[0m`);
            }
            else {
                console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[31mFAILED\x1b[0m   Reason: ${result.errorCode}`);
            }
        };
        formatProvider('Gemini', report.gemini);
        formatProvider('Groq', report.groq);
        formatProvider('HuggingFace', report.huggingface);
        const overallColor = report.overall === 'healthy' ? '\x1b[32m' :
            report.overall === 'degraded' ? '\x1b[33m' : '\x1b[31m';
        console.log(`\n  Overall: ${overallColor}${report.overall.toUpperCase()}\x1b[0m  (${report.workingCount}/${report.totalCount} providers working)`);
        console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
    }
    catch (err) {
        console.error('[AIHealth] Startup health check encountered an error:', err.message);
    }
}
