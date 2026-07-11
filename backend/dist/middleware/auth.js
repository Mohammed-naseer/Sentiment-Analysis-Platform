"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebase_1 = require("../config/firebase");
const env_1 = require("../config/env");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Authentication Middleware
 * Validates incoming tokens (both Firebase ID Tokens and custom backend JWTs),
 * matches user in MongoDB (creating profile if missing), and sets req.user context.
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_1.sendError)(res, 'Access denied. No token provided.', 'TokenMissingError', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        let decodedUser = null;
        // 1. Try verifying with Firebase Admin if initialized
        if (firebase_1.isFirebaseInitialized) {
            try {
                const decodedToken = await firebase_1.auth.verifyIdToken(token);
                decodedUser = {
                    uid: decodedToken.uid,
                    email: decodedToken.email || '',
                    name: decodedToken.name || '',
                    photoURL: decodedToken.picture || '',
                };
            }
            catch (fbError) {
                logger_1.default.debug('Firebase token verification failed, falling back to custom JWT...');
            }
        }
        // 2. Try verifying with custom JWT if Firebase token verify wasn't successful
        if (!decodedUser) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
                decodedUser = {
                    uid: decoded.uid,
                    email: decoded.email,
                    name: decoded.name || '',
                    photoURL: decoded.photoURL || '',
                };
            }
            catch (jwtError) {
                (0, response_1.sendError)(res, 'Invalid or expired authentication token.', jwtError.message || 'TokenInvalidError', 401);
                return;
            }
        }
        // 3. Find or sync user profile in MongoDB Database
        let mongoUser = await User_1.User.findOne({ firebaseUid: decodedUser.uid });
        if (!mongoUser) {
            // Attempt lookup by email as fallback
            mongoUser = await User_1.User.findOne({ email: decodedUser.email.toLowerCase() });
            if (mongoUser) {
                // Link firebaseUid to existing email record
                mongoUser.firebaseUid = decodedUser.uid;
                await mongoUser.save();
            }
            else {
                // Create a new User document in MongoDB
                try {
                    mongoUser = await User_1.User.create({
                        firebaseUid: decodedUser.uid,
                        email: decodedUser.email.toLowerCase(),
                        name: decodedUser.name || decodedUser.email.split('@')[0],
                        photoURL: decodedUser.photoURL || '',
                    });
                    logger_1.default.info(`[AuthMiddleware] Synchronized new MongoDB User record for uid: ${decodedUser.uid}`);
                }
                catch (dbError) {
                    logger_1.default.error('Failed to auto-create MongoDB user profile:', dbError.message);
                    (0, response_1.sendError)(res, 'Database user synchronization failed.', dbError.message, 500);
                    return;
                }
            }
        }
        // Check if user is approved
        if (!mongoUser.approved) {
            if (mongoUser.status === 'Rejected') {
                (0, response_1.sendError)(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
                return;
            }
            (0, response_1.sendError)(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
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
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Authentication failed.', error.message || 'AuthError', 500);
        return;
    }
};
exports.verifyToken = verifyToken;
/**
 * Admin Role Authorization Middleware
 */
const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'Admin') {
        (0, response_1.sendError)(res, 'Access denied. Administrator privileges required.', 'AdminPrivilegesRequiredError', 403);
        return;
    }
    next();
};
exports.verifyAdmin = verifyAdmin;
