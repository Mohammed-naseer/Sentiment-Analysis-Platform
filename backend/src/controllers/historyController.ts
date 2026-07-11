import { Request, Response } from 'express';
import { Analysis } from '../models/Analysis';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Retrieve sentiment analysis history for authenticated user
 * GET /api/history
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  try {
    const history = await Analysis.find({ userId: user._id })
      .sort({ createdAt: -1 });

    sendSuccess(res, 'History logs retrieved successfully.', history);
  } catch (error: any) {
    logger.error('[HistoryController] Failed to fetch history:', error.message);
    sendError(res, 'Failed to fetch history.', error.message || error, 500);
  }
};

/**
 * Delete a specific analysis record
 * DELETE /api/history/:id
 */
export const deleteHistoryItem = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { id } = req.params;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  try {
    const record = await Analysis.findOneAndDelete({ _id: id, userId: user._id });

    if (!record) {
      sendError(res, 'Analysis record not found or unauthorized.', 'NotFoundError', 404);
      return;
    }

    sendSuccess(res, 'Analysis record deleted successfully.', { id });
  } catch (error: any) {
    logger.error('[HistoryController] Failed to delete history item:', error.message);
    sendError(res, 'Failed to delete record.', error.message || error, 500);
  }
};
