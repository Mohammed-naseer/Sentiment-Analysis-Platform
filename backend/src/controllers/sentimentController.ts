import { Request, Response } from 'express';
import { runMultiModelAnalysis, AIServicesUnavailableError } from '../services/analysisService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Trigger parallel multi-model sentiment analysis
 * POST /api/sentiment/analyze
 */
export const analyze = async (req: Request, res: Response): Promise<void> => {
  const { text, product, category } = req.body;
  const user = req.user;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    sendError(res, 'Text is required for analysis.', 'ValidationError', 400);
    return;
  }

  try {
    // Run multi-model analysis in parallel and save to database
    const savedRecord = await runMultiModelAnalysis(user._id, text, {
      product: product || 'General',
      category: category || 'General',
      analysisType: 'Single',
    });

    // Format response matching requested schema
    const formattedData = {
      id: savedRecord._id,
      analysisId: savedRecord.analysisId,
      text: savedRecord.text,
      inputHash: savedRecord.inputHash,
      models: {
        gemini: savedRecord.gemini,
        groq: savedRecord.groq,
        huggingface: savedRecord.huggingface,
      },
      finalResult: {
        sentiment: savedRecord.finalSentiment,
        confidence: savedRecord.sentimentConfidence,
        agreementPercentage: savedRecord.agreementPercentage,
        mostConfidentModel: savedRecord.mostConfidentModel,
        activeProvidersCount: savedRecord.activeProvidersCount,
        totalProvidersCount: savedRecord.totalProvidersCount,
      },
      aspects: savedRecord.aspectResults,
      createdAt: savedRecord.createdAt,
    };

    sendSuccess(res, 'Sentiment analysis complete.', formattedData);
  } catch (error: any) {
    // ─── Total provider failure → HTTP 503 ────────────────────────────────────
    if (error instanceof AIServicesUnavailableError) {
      logger.error(`[SentimentController] All AI providers failed. Working: ${error.workingProviders}/${error.totalProviders}`);
      res.status(503).json({
        success: false,
        error: 'AI_SERVICES_UNAVAILABLE',
        message: 'All AI providers are currently unavailable. Please try again later.',
        workingProviders: error.workingProviders,
        totalProviders: error.totalProviders,
      });
      return;
    }

    logger.error('[SentimentController] Error running analysis:', error.message);
    sendError(res, 'Sentiment analysis failed.', error.message || error, 500);
  }
};

/**
 * Trigger Python Deep Learning (CNN / LSTM / RoBERTa / Ensemble) analysis
 * POST /api/sentiment/ml-analyze
 */
export const mlAnalyze = async (req: Request, res: Response): Promise<void> => {
  const { text, model } = req.body;
  const user = req.user;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    sendError(res, 'Text is required for analysis.', 'ValidationError', 400);
    return;
  }

  try {
    const { analyzeWithPythonMl, predictWithPythonMl } = await import('../services/pythonMlService');
    const mlResult = model && model !== 'all' 
      ? await predictWithPythonMl(text, model)
      : await analyzeWithPythonMl(text);
    sendSuccess(res, 'Python ML analysis complete.', mlResult);
  } catch (error: any) {
    logger.error('[SentimentController] Python ML service error:', error.message);
    sendError(res, `Python ML service unavailable: ${error.message}`, 'MLServiceError', 503);
  }
};

