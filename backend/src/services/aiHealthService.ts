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

import { genAI, isGeminiInitialized, resolvedGeminiModel } from '../config/gemini';
import { groq, isGroqInitialized } from '../config/groq';
import { huggingFaceConfig } from '../config/huggingface';
import { config } from '../config/env';
import logger from '../utils/logger';

export type ProviderStatus = 'working' | 'failed' | 'not_configured';

export interface ProviderHealthResult {
  configured: boolean;
  status: ProviderStatus;
  model?: string;
  responseReceived?: boolean;
  errorCode?: string;
  errorDetail?: string;
  latencyMs?: number;
}

export interface AIHealthReport {
  gemini: ProviderHealthResult;
  groq: ProviderHealthResult;
  huggingface: ProviderHealthResult;
  workingCount: number;
  totalCount: number;
  overall: 'healthy' | 'degraded' | 'unavailable';
  checkedAt: string;
}

const TEST_TEXT = 'This is a quick API connectivity test.';

// ─── Gemini ────────────────────────────────────────────────────────────────────
async function checkGemini(): Promise<ProviderHealthResult> {
  const configured = !!(config.geminiApiKey && config.geminiApiKey !== 'mock-or-replace-with-real-key');

  if (!configured) {
    return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
  }

  if (!isGeminiInitialized || !genAI) {
    return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'SDK failed to initialize' };
  }

  // Await the auto-discovered model
  let model: string;
  try {
    model = await Promise.race([
      resolvedGeminiModel,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 30_000)
      ),
    ]);
  } catch (err: any) {
    const msg: string = err?.message || '';
    logger.warn(`[AIHealth] Gemini model discovery failed: ${msg}`);
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
      genAI.models.generateContent({
        model,
        contents: `Respond with OK for connectivity test: "${TEST_TEXT}"`,
        config: { maxOutputTokens: 50 },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000)),
    ]);
    const text = (response as any).text ?? (response as any).candidates?.[0]?.content?.parts?.[0]?.text;
    const isValidResponse = response && (typeof text === 'string' || (response as any).candidates?.length > 0);
    if (!isValidResponse) throw new Error('EMPTY_RESPONSE');
    return { configured: true, status: 'working', model, responseReceived: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg: string = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || '';
    let errorCode = 'UNKNOWN_ERROR';
    if (msg === 'TIMEOUT')                                                               errorCode = 'TIMEOUT';
    else if (msg.includes('API key') || msg.includes('401'))                             errorCode = 'INVALID_API_KEY';
    else if (msg.includes('403'))                                                        errorCode = 'AUTHENTICATION_ERROR';
    else if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) errorCode = 'QUOTA_EXCEEDED';
    else if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) errorCode = 'MODEL_NOT_FOUND';
    else if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) errorCode = 'NETWORK_ERROR';
    logger.warn(`[AIHealth] Gemini check failed: ${errorCode} — ${msg.slice(0, 150)}`);
    return { configured: true, status: 'failed', model, responseReceived: false, errorCode, latencyMs };
  }
}

// ─── Groq ──────────────────────────────────────────────────────────────────────
async function checkGroq(): Promise<ProviderHealthResult> {
  const configured = !!(config.groqApiKey && config.groqApiKey !== 'mock-or-replace-with-real-key');

  if (!configured) {
    return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
  }

  if (!isGroqInitialized || !groq) {
    return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'SDK failed to initialize' };
  }

  const model = config.groqModel;
  const start = Date.now();
  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: `Return JSON object {"ok":true}. Test: "${TEST_TEXT}"` }],
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature: 0,
      stream: false,
    });
    const completed = await Promise.race([
      Promise.resolve(response),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10_000)),
    ]);
    const text = completed.choices[0]?.message?.content;
    if (!text) throw new Error('EMPTY_RESPONSE');
    return { configured: true, status: 'working', model, responseReceived: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg: string = err?.message || '';
    const statusCode = err?.status || err?.statusCode || 0;
    let errorCode = 'UNKNOWN_ERROR';
    if (msg === 'TIMEOUT')                                                                      errorCode = 'TIMEOUT';
    else if (statusCode === 401 || msg.includes('Invalid API Key') || msg.includes('authentication')) errorCode = 'INVALID_API_KEY';
    else if (statusCode === 403)                                                                errorCode = 'AUTHENTICATION_ERROR';
    else if (statusCode === 429 || msg.includes('rate limit'))                                  errorCode = 'RATE_LIMIT';
    else if (msg.includes('quota'))                                                             errorCode = 'QUOTA_EXCEEDED';
    else if (statusCode === 404 || msg.includes('model'))                                       errorCode = 'MODEL_NOT_FOUND';
    else if (msg.includes('fetch') || msg.includes('ECONNREFUSED'))                             errorCode = 'NETWORK_ERROR';
    logger.warn(`[AIHealth] Groq check failed: ${errorCode} — ${msg}`);
    return { configured: true, status: 'failed', model, responseReceived: false, errorCode, latencyMs };
  }
}

// ─── Hugging Face ──────────────────────────────────────────────────────────────
async function checkHuggingFace(): Promise<ProviderHealthResult> {
  const configured = !!(config.hfToken && config.hfToken !== 'mock-or-replace-with-real-key');

  if (!configured) {
    return { configured: false, status: 'not_configured', errorCode: 'MISSING_API_KEY' };
  }

  if (!huggingFaceConfig.isInitialized || !huggingFaceConfig.client) {
    return { configured: true, status: 'failed', errorCode: 'AUTHENTICATION_ERROR', errorDetail: 'InferenceClient not initialized' };
  }

  const model = huggingFaceConfig.hfModel;
  const start = Date.now();

  try {
    const rawResult = await Promise.race([
      huggingFaceConfig.client.textClassification({
        model,
        inputs: TEST_TEXT,
        provider: 'auto',
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error('TIMEOUT'), { name: 'AbortError' })), 20_000)),
    ]);

    const latencyMs = Date.now() - start;
    const predictions = Array.isArray(rawResult) ? rawResult : [rawResult];
    if (!predictions.length) throw new Error('UNEXPECTED_RESPONSE_FORMAT');

    return { configured: true, status: 'working', model, responseReceived: true, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg: string = (err?.message || '').toLowerCase();
    const status: number = err?.status || err?.statusCode || 0;

    let errorCode = 'UNKNOWN_ERROR';
    if (err?.name === 'AbortError' || msg.includes('timed out') || msg === 'timeout') errorCode = 'TIMEOUT';
    else if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('invalid token')) errorCode = 'AUTHENTICATION_ERROR';
    else if (status === 429 || msg.includes('rate limit'))                         errorCode = 'RATE_LIMIT';
    else if (status === 402 || msg.includes('quota'))                              errorCode = 'QUOTA_EXCEEDED';
    else if (status === 404 || msg.includes('not found') || status === 503 || msg.includes('loading')) errorCode = 'MODEL_NOT_FOUND';
    else if (status === 400 || msg.includes('invalid request'))                    errorCode = 'INVALID_REQUEST';
    else if (msg.includes('fetch failed') || msg.includes('econnrefused') || msg.includes('network') || err?.name === 'TypeError') errorCode = 'NETWORK_ERROR';

    // Safe diagnostics — no token logged
    logger.warn(`[AIHealth] HuggingFace check failed: ${errorCode}`, {
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
export async function runAIHealthCheck(): Promise<AIHealthReport> {
  logger.info('[AIHealth] Running AI provider health check…');

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
export async function logStartupAIHealth(): Promise<void> {
  try {
    console.log('\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    console.log('\x1b[36m  AI Provider Health Check\x1b[0m');
    console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');

    const report = await runAIHealthCheck();

    const formatProvider = (name: string, result: ProviderHealthResult): void => {
      const configStatus = result.configured ? '\x1b[32mCONFIGURED\x1b[0m' : '\x1b[31mMISSING\x1b[0m';
      if (result.status === 'working') {
        console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[32mWORKING\x1b[0m  (${result.latencyMs}ms)  Model: ${result.model}`);
      } else if (result.status === 'not_configured') {
        console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[31mSKIPPED\x1b[0m`);
      } else {
        console.log(`  ${name.padEnd(14)} ${configStatus} → \x1b[31mFAILED\x1b[0m   Reason: ${result.errorCode}`);
      }
    };

    formatProvider('Gemini',      report.gemini);
    formatProvider('Groq',        report.groq);
    formatProvider('HuggingFace', report.huggingface);

    const overallColor =
      report.overall === 'healthy'     ? '\x1b[32m' :
      report.overall === 'degraded'    ? '\x1b[33m' : '\x1b[31m';

    console.log(`\n  Overall: ${overallColor}${report.overall.toUpperCase()}\x1b[0m  (${report.workingCount}/${report.totalCount} providers working)`);
    console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
  } catch (err: any) {
    console.error('[AIHealth] Startup health check encountered an error:', err.message);
  }
}
