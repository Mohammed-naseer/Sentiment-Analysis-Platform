import { Request, Response } from 'express';
import { runMultiModelAnalysis } from '../services/analysisService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Trigger parallel multi-model sentiment analysis
 * POST /api/sentiment/analyze
 */
export const analyze = async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body;
  const user = req.user;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  try {
    // Run multi-model analysis in parallel and save to database
    const savedRecord = await runMultiModelAnalysis(user._id, text);

    // Format response matching requested schema
    const formattedData = {
      id: savedRecord._id,
      text: savedRecord.text,
      models: {
        gemini: savedRecord.gemini,
        groq: savedRecord.groq,
        huggingface: savedRecord.huggingface,
      },
      finalResult: {
        sentiment: savedRecord.finalSentiment,
        agreementPercentage: savedRecord.agreementPercentage,
        mostConfidentModel: savedRecord.mostConfidentModel,
      },
      createdAt: savedRecord.createdAt,
    };

    sendSuccess(res, 'Sentiment analysis complete.', formattedData);
  } catch (error: any) {
    logger.error('[SentimentController] Error running analysis:', error.message);
    sendError(res, 'Sentiment analysis failed.', error.message || error, 500);
  }
};
