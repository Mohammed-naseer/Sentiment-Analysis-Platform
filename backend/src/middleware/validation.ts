import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Middleware runner to inspect express-validator results
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors
      .array()
      .map(err => `${err.type === 'field' ? err.path : 'param'}: ${err.msg}`)
      .join(', ');
      
    sendError(res, 'Validation failed.', errorMsg, 400);
    return;
  }
  next();
};

export const registerValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('photoURL').optional().isURL().withMessage('Photo URL must be a valid URL.'),
  validateRequest
];

export const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  validateRequest
];

export const googleLoginValidation = [
  body('idToken').notEmpty().withMessage('Firebase ID token is required.'),
  validateRequest
];

export const sentimentValidation = [
  body('text').trim().notEmpty().withMessage('Text content is required for analysis.'),
  body('text').isLength({ max: 8000 }).withMessage('Text exceeds maximum length of 8,000 characters. Please shorten the input.'),
  validateRequest
];

export const profileUpdateValidation = [
  body('name').trim().notEmpty().withMessage('Name must not be empty.'),
  body('photoURL').optional().isURL().withMessage('Photo URL must be a valid URL.'),
  validateRequest
];

export const deleteHistoryValidation = [
  param('id').isMongoId().withMessage('Please provide a valid MongoDB Analysis ID.'),
  validateRequest
];
