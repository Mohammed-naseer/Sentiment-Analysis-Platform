"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Retrieve user profile data
 * GET /api/profile
 */
const getProfile = async (req, res) => {
    const user = req.user;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        const profile = await User_1.User.findById(user._id);
        if (!profile) {
            (0, response_1.sendError)(res, 'User profile not found.', 'NotFoundError', 404);
            return;
        }
        (0, response_1.sendSuccess)(res, 'Profile retrieved successfully.', {
            _id: profile._id,
            name: profile.name,
            email: profile.email,
            firebaseUid: profile.firebaseUid,
            photoURL: profile.photoURL,
            createdAt: profile.createdAt,
        });
    }
    catch (error) {
        logger_1.default.error('[ProfileController] Failed to fetch user profile:', error.message);
        (0, response_1.sendError)(res, 'Failed to fetch user profile.', error.message || error, 500);
    }
};
exports.getProfile = getProfile;
/**
 * Update profile details (Name & Profile Image)
 * PUT /api/profile
 */
const updateProfile = async (req, res) => {
    const user = req.user;
    const { name, photoURL } = req.body;
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    try {
        const profile = await User_1.User.findById(user._id);
        if (!profile) {
            (0, response_1.sendError)(res, 'User profile not found.', 'NotFoundError', 404);
            return;
        }
        // Update mongoose document fields
        profile.name = name;
        if (photoURL !== undefined) {
            profile.photoURL = photoURL;
        }
        await profile.save();
        logger_1.default.info(`[ProfileController] Profile updated for user: ${profile._id}`);
        (0, response_1.sendSuccess)(res, 'Profile updated successfully.', {
            _id: profile._id,
            name: profile.name,
            email: profile.email,
            firebaseUid: profile.firebaseUid,
            photoURL: profile.photoURL,
            createdAt: profile.createdAt,
        });
    }
    catch (error) {
        logger_1.default.error('[ProfileController] Failed to update profile:', error.message);
        (0, response_1.sendError)(res, 'Failed to update profile.', error.message || error, 500);
    }
};
exports.updateProfile = updateProfile;
