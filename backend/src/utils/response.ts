import { Response } from 'express';

export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
}

/**
 * Sends a standardized success response
 */
export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data: T = {} as T,
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Sends a standardized error response
 */
export const sendError = (
  res: Response,
  message: string,
  error: string | Error | any = '',
  statusCode: number = 500
): Response<ErrorResponse> => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return res.status(statusCode).json({
    success: false,
    message,
    error: errorMsg,
  });
};
