import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Global centralized error handler middleware
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('[ErrorHandler] Unhandled error occurred:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errorDetails = process.env.NODE_ENV === 'development' ? err.stack || err : '';

  sendError(res, message, errorDetails, statusCode);
};

/**
 * 404 Not Found route handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  sendError(res, `Route not found - ${req.originalUrl}`, 'NotFoundError', 404);
};
