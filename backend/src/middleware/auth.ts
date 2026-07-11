import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth, isFirebaseInitialized } from '../config/firebase';
import { config } from '../config/env';
import { User } from '../models/User';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Authentication Middleware
 * Validates incoming tokens (both Firebase ID Tokens and custom backend JWTs),
 * matches user in MongoDB (creating profile if missing), and sets req.user context.
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Access denied. No token provided.', 'TokenMissingError', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    let decodedUser: { uid: string; email: string; name?: string; photoURL?: string } | null = null;

    // 1. Try verifying with Firebase Admin if initialized
    if (isFirebaseInitialized) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        decodedUser = {
          uid: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || '',
          photoURL: decodedToken.picture || '',
        };
      } catch (fbError) {
        logger.debug('Firebase token verification failed, falling back to custom JWT...');
      }
    }

    // 2. Try verifying with custom JWT if Firebase token verify wasn't successful
    if (!decodedUser) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as {
          uid: string;
          email: string;
          name?: string;
          photoURL?: string;
        };
        decodedUser = {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || '',
          photoURL: decoded.photoURL || '',
        };
      } catch (jwtError: any) {
        sendError(res, 'Invalid or expired authentication token.', jwtError.message || 'TokenInvalidError', 401);
        return;
      }
    }

    // 3. Find or sync user profile in MongoDB Database
    let mongoUser = await User.findOne({ firebaseUid: decodedUser.uid });
    
    if (!mongoUser) {
      // Attempt lookup by email as fallback
      mongoUser = await User.findOne({ email: decodedUser.email.toLowerCase() });
      
      if (mongoUser) {
        // Link firebaseUid to existing email record
        mongoUser.firebaseUid = decodedUser.uid;
        await mongoUser.save();
      } else {
        // Create a new User document in MongoDB
        try {
          mongoUser = await User.create({
            firebaseUid: decodedUser.uid,
            email: decodedUser.email.toLowerCase(),
            name: decodedUser.name || decodedUser.email.split('@')[0],
            photoURL: decodedUser.photoURL || '',
          });
          logger.info(`[AuthMiddleware] Synchronized new MongoDB User record for uid: ${decodedUser.uid}`);
        } catch (dbError: any) {
          logger.error('Failed to auto-create MongoDB user profile:', dbError.message);
          sendError(res, 'Database user synchronization failed.', dbError.message, 500);
          return;
        }
      }
    }

    // Check if user is approved
    if (!mongoUser.approved) {
      if (mongoUser.status === 'Rejected') {
        sendError(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
        return;
      }
      sendError(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
      return;
    }

    // 4. Attach mongoose user ID and details to Request context
    req.user = {
      _id: mongoUser._id.toString(),
      uid: mongoUser.firebaseUid,
      email: mongoUser.email,
      name: mongoUser.name,
      photoURL: mongoUser.photoURL || '',
      role: mongoUser.role,
      status: mongoUser.status,
      approved: mongoUser.approved,
    };

    return next();
  } catch (error: any) {
    sendError(res, 'Authentication failed.', error.message || 'AuthError', 500);
    return;
  }
};

/**
 * Admin Role Authorization Middleware
 */
export const verifyAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'Admin') {
    sendError(res, 'Access denied. Administrator privileges required.', 'AdminPrivilegesRequiredError', 403);
    return;
  }
  next();
};
