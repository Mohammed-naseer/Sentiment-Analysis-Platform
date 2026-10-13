import { Request, Response } from 'express';
import { runAIHealthCheck } from '../services/aiHealthService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * GET /api/health/ai
 * Admin-only: Returns real-time AI provider health.
 * Never exposes API keys.
 */
export const getAIHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await runAIHealthCheck();

    // Strip any sensitive info before sending
    const safeReport = {
      gemini: {
        configured: report.gemini.configured,
        status: report.gemini.status,
        model: report.gemini.model,
        responseReceived: report.gemini.responseReceived ?? false,
        errorCode: report.gemini.errorCode,
        latencyMs: report.gemini.latencyMs,
      },
      groq: {
        configured: report.groq.configured,
        status: report.groq.status,
        model: report.groq.model,
        responseReceived: report.groq.responseReceived ?? false,
        errorCode: report.groq.errorCode,
        latencyMs: report.groq.latencyMs,
      },
      huggingface: {
        configured: report.huggingface.configured,
        status: report.huggingface.status,
        model: report.huggingface.model,
        responseReceived: report.huggingface.responseReceived ?? false,
        errorCode: report.huggingface.errorCode,
        latencyMs: report.huggingface.latencyMs,
      },
      overall: report.overall,
      workingProviders: `${report.workingCount}/${report.totalCount}`,
      analysisQuality: report.workingCount === 3 ? 'FULL' : report.workingCount > 0 ? 'LIMITED' : 'UNAVAILABLE',
      checkedAt: report.checkedAt,
    };

    sendSuccess(res, 'AI provider health check complete.', safeReport);
  } catch (err: any) {
    logger.error('[HealthController] AI health check failed:', err.message);
    sendError(res, 'Failed to run AI health check.', err.message, 500);
  }
};
