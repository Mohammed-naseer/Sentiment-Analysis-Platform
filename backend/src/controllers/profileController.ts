import { Request, Response } from 'express';
import { User } from '../models/User';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Retrieve user profile data
 * GET /api/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  try {
    const profile = await User.findById(user._id);

    if (!profile) {
      sendError(res, 'User profile not found.', 'NotFoundError', 404);
      return;
    }

    sendSuccess(res, 'Profile retrieved successfully.', {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      firebaseUid: profile.firebaseUid,
      photoURL: profile.photoURL,
      createdAt: profile.createdAt,
    });
  } catch (error: any) {
    logger.error('[ProfileController] Failed to fetch user profile:', error.message);
    sendError(res, 'Failed to fetch user profile.', error.message || error, 500);
  }
};

/**
 * Update profile details (Name & Profile Image)
 * PUT /api/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const { name, photoURL } = req.body;

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  try {
    const profile = await User.findById(user._id);

    if (!profile) {
      sendError(res, 'User profile not found.', 'NotFoundError', 404);
      return;
    }

    // Update mongoose document fields
    profile.name = name;
    if (photoURL !== undefined) {
      profile.photoURL = photoURL;
    }
    await profile.save();

    logger.info(`[ProfileController] Profile updated for user: ${profile._id}`);
    
    sendSuccess(res, 'Profile updated successfully.', {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      firebaseUid: profile.firebaseUid,
      photoURL: profile.photoURL,
      createdAt: profile.createdAt,
    });
  } catch (error: any) {
    logger.error('[ProfileController] Failed to update profile:', error.message);
    sendError(res, 'Failed to update profile.', error.message || error, 500);
  }
};
