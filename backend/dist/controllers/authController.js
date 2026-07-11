"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.googleLogin = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const firebase_1 = require("../config/firebase");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const env_1 = require("../config/env");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
const emailService_1 = require("../services/emailService");
const adminController_1 = require("../controllers/adminController");
/**
 * Register User
 * POST /api/auth/register
 */
const register = async (req, res) => {
    const { email, password, name, photoURL } = req.body;
    try {
        // Check if user already exists in MongoDB
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            (0, response_1.sendError)(res, 'User with this email already exists.', 'EmailConflictError', 400);
            return;
        }
        let firebaseUid = `mock_${Date.now()}`;
        if (firebase_1.isFirebaseInitialized) {
            try {
                // Create user in Firebase Authentication
                const firebaseUser = await firebase_1.auth.createUser({
                    email,
                    password,
                    displayName: name,
                    ...(photoURL ? { photoURL } : {}),
                });
                firebaseUid = firebaseUser.uid;
            }
            catch (fbError) {
                logger_1.default.error('Firebase Auth registration failed:', fbError.message);
                // If the email is already in use, suggest logging in
                const isEmailExists = fbError.code === 'auth/email-already-exists' || fbError.message?.includes('already in use') || fbError.message?.includes('already exists');
                if (isEmailExists) {
                    (0, response_1.sendError)(res, 'Email is already registered.', 'Please log in instead.', 400);
                    return;
                }
                // If it is a network or ssl/tls handshake error, fallback to local registration
                const isNetworkErr = fbError.message?.includes('SSL') || fbError.message?.includes('network') || fbError.message?.includes('ECONNREFUSED') || fbError.message?.includes('alert');
                if (isNetworkErr) {
                    logger_1.default.warn('SSL/Network error encountered with Firebase. Falling back to local registration.');
                    firebaseUid = `mock_uid_${email.replace(/[@.]/g, '_')}`;
                }
                else {
                    (0, response_1.sendError)(res, 'Firebase Auth registration failed.', fbError.message || fbError, 400);
                    return;
                }
            }
        }
        // Self-bootstrapping logic: First user in database is automatically approved as Admin
        const userCount = await User_1.User.countDocuments({});
        const isFirstUser = userCount === 0;
        const status = isFirstUser ? 'Approved' : 'Pending';
        const role = isFirstUser ? 'Admin' : 'Pending';
        const approved = isFirstUser;
        // Save profile to MongoDB Atlas Database
        const newUser = await User_1.User.create({
            name,
            email: email.toLowerCase(),
            firebaseUid,
            photoURL: photoURL || '',
            status,
            role,
            approved,
        });
        if (!isFirstUser) {
            // Send email to admin with one-click action token
            const emailToken = (0, adminController_1.generateEmailActionToken)(String(newUser._id), newUser.name, newUser.email);
            await (0, emailService_1.sendAdminRegistrationRequest)({ name: newUser.name, email: newUser.email }, emailToken);
            // Create Bell Notification in DB for all Admin users
            try {
                const admins = await User_1.User.find({ role: 'Admin' });
                for (const admin of admins) {
                    await Notification_1.Notification.create({
                        userId: admin._id,
                        title: 'New User Registration Request',
                        message: `A new user ${newUser.name} (${newUser.email}) has requested access.`,
                        type: 'request',
                    });
                }
            }
            catch (err) {
                logger_1.default.error('Failed to create admin registration notification:', err.message);
            }
        }
        // Generate local JWT token (only if approved/first user, otherwise send null)
        let token = null;
        if (approved) {
            token = jsonwebtoken_1.default.sign({
                uid: firebaseUid,
                email: newUser.email,
                name: newUser.name,
                photoURL: newUser.photoURL,
                role: newUser.role,
                status: newUser.status,
                approved: newUser.approved,
            }, env_1.config.jwtSecret, { expiresIn: '7d' });
        }
        (0, response_1.sendSuccess)(res, isFirstUser ? 'First user registered and approved as Admin successfully.' : 'Registration request submitted successfully. Awaiting administrator approval.', {
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                photoURL: newUser.photoURL,
                status: newUser.status,
                role: newUser.role,
                approved: newUser.approved,
                createdAt: newUser.createdAt,
            },
            token,
        }, 201);
    }
    catch (error) {
        logger_1.default.error('Registration failed:', error.message);
        (0, response_1.sendError)(res, 'Registration failed.', error.message || error, 500);
    }
};
exports.register = register;
/**
 * Login User
 * POST /api/auth/login
 */
const login = async (req, res) => {
    const { email } = req.body;
    try {
        // Find user in MongoDB
        let dbUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!dbUser) {
            // If Firebase is initialized, check if user exists there
            if (firebase_1.isFirebaseInitialized) {
                try {
                    const fbUser = await firebase_1.auth.getUserByEmail(email);
                    const userCount = await User_1.User.countDocuments({});
                    const isFirstUser = userCount === 0;
                    // Sync existing Firebase user to MongoDB
                    dbUser = await User_1.User.create({
                        name: fbUser.displayName || email.split('@')[0],
                        email: email.toLowerCase(),
                        firebaseUid: fbUser.uid,
                        photoURL: fbUser.photoURL || '',
                        status: isFirstUser ? 'Approved' : 'Pending',
                        role: isFirstUser ? 'Admin' : 'Pending',
                        approved: isFirstUser,
                    });
                    // Send notification email to Admin
                    const emailToken1 = (0, adminController_1.generateEmailActionToken)(String(dbUser._id), dbUser.name, dbUser.email);
                    await (0, emailService_1.sendAdminRegistrationRequest)({ name: dbUser.name, email: dbUser.email }, emailToken1);
                    // Create Bell Notification for Admins
                    try {
                        const admins = await User_1.User.find({ role: 'Admin' });
                        for (const admin of admins) {
                            await Notification_1.Notification.create({
                                userId: admin._id,
                                title: 'New User Registration Request',
                                message: `A new user ${dbUser.name} (${dbUser.email}) has requested access.`,
                                type: 'request',
                            });
                        }
                    }
                    catch (err) {
                        logger_1.default.error('Failed to create admin notification:', err.message);
                    }
                }
                catch (fbError) {
                    // If it is a network error, allow creating local dev user
                    const isNetworkErr = fbError.message?.includes('SSL') || fbError.message?.includes('network') || fbError.message?.includes('ECONNREFUSED') || fbError.message?.includes('alert');
                    if (isNetworkErr) {
                        logger_1.default.warn('SSL/Network error encountered with Firebase. Creating local dev profile.');
                        dbUser = await User_1.User.create({
                            name: email.split('@')[0],
                            email: email.toLowerCase(),
                            firebaseUid: `mock_uid_${email.replace(/[@.]/g, '_')}`,
                            photoURL: '',
                            status: 'Pending',
                            role: 'Pending',
                            approved: false,
                        });
                        const emailToken2 = (0, adminController_1.generateEmailActionToken)(String(dbUser._id), dbUser.name, dbUser.email);
                        await (0, emailService_1.sendAdminRegistrationRequest)({ name: dbUser.name, email: dbUser.email }, emailToken2);
                        // Create Bell Notification for Admins
                        try {
                            const admins = await User_1.User.find({ role: 'Admin' });
                            for (const admin of admins) {
                                await Notification_1.Notification.create({
                                    userId: admin._id,
                                    title: 'New User Registration Request',
                                    message: `A new user ${dbUser.name} (${dbUser.email}) has requested access.`,
                                    type: 'request',
                                });
                            }
                        }
                        catch (err) {
                            logger_1.default.error('Failed to create admin notification:', err.message);
                        }
                    }
                    else {
                        (0, response_1.sendError)(res, 'User record not found. Please register.', 'UserNotFoundError', 404);
                        return;
                    }
                }
            }
            else {
                // Safe mock creation for local developer testing
                dbUser = await User_1.User.create({
                    name: email.split('@')[0],
                    email: email.toLowerCase(),
                    firebaseUid: `mock_uid_${email.replace(/[@.]/g, '_')}`,
                    photoURL: '',
                    status: 'Pending',
                    role: 'Pending',
                    approved: false,
                });
                logger_1.default.info(`[Auth] Created mock MongoDB profile for login: ${email}`);
                const emailToken3 = (0, adminController_1.generateEmailActionToken)(String(dbUser._id), dbUser.name, dbUser.email);
                await (0, emailService_1.sendAdminRegistrationRequest)({ name: dbUser.name, email: dbUser.email }, emailToken3);
                // Create Bell Notification for Admins
                try {
                    const admins = await User_1.User.find({ role: 'Admin' });
                    for (const admin of admins) {
                        await Notification_1.Notification.create({
                            userId: admin._id,
                            title: 'New User Registration Request',
                            message: `A new user ${dbUser.name} (${dbUser.email}) has requested access.`,
                            type: 'request',
                        });
                    }
                }
                catch (err) {
                    logger_1.default.error('Failed to create admin notification:', err.message);
                }
            }
        }
        // Check approval status
        if (!dbUser.approved) {
            if (dbUser.status === 'Rejected') {
                (0, response_1.sendError)(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
                return;
            }
            (0, response_1.sendError)(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
            return;
        }
        // Generate local JWT token
        const token = jsonwebtoken_1.default.sign({
            uid: dbUser.firebaseUid,
            email: dbUser.email,
            name: dbUser.name,
            photoURL: dbUser.photoURL,
            role: dbUser.role,
            status: dbUser.status,
            approved: dbUser.approved,
        }, env_1.config.jwtSecret, { expiresIn: '7d' });
        (0, response_1.sendSuccess)(res, 'Login successful.', {
            user: {
                _id: dbUser._id,
                name: dbUser.name,
                email: dbUser.email,
                photoURL: dbUser.photoURL,
                status: dbUser.status,
                role: dbUser.role,
                approved: dbUser.approved,
                createdAt: dbUser.createdAt,
            },
            token,
        });
    }
    catch (error) {
        logger_1.default.error('Login failed:', error.message);
        (0, response_1.sendError)(res, 'Login failed.', error.message || error, 500);
    }
};
exports.login = login;
/**
 * Verify Google ID Token
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
    const { idToken } = req.body;
    try {
        let firebaseUid = '';
        let email = '';
        let name = '';
        let photoURL = '';
        if (firebase_1.isFirebaseInitialized) {
            // Verify ID Token with Firebase Auth Admin SDK
            const decodedToken = await firebase_1.auth.verifyIdToken(idToken);
            firebaseUid = decodedToken.uid;
            email = decodedToken.email || '';
            name = decodedToken.name || '';
            photoURL = decodedToken.picture || '';
        }
        else {
            // Mock validation for local development
            logger_1.default.warn('[Auth] Google Login: Firebase not initialized. Using simulated ID token verification.');
            firebaseUid = 'mock_google_user_12345';
            email = 'google.user@example.com';
            name = 'Google User';
            photoURL = 'https://lh3.googleusercontent.com/a/default-user';
        }
        // Find or sync MongoDB User Profile
        let dbUser = await User_1.User.findOne({ firebaseUid });
        if (!dbUser) {
            dbUser = await User_1.User.findOne({ email: email.toLowerCase() });
            if (dbUser) {
                dbUser.firebaseUid = firebaseUid;
                if (photoURL && !dbUser.photoURL)
                    dbUser.photoURL = photoURL;
                await dbUser.save();
            }
            else {
                const userCount = await User_1.User.countDocuments({});
                const isFirstUser = userCount === 0;
                dbUser = await User_1.User.create({
                    name,
                    email: email.toLowerCase(),
                    firebaseUid,
                    photoURL,
                    status: isFirstUser ? 'Approved' : 'Pending',
                    role: isFirstUser ? 'Admin' : 'Pending',
                    approved: isFirstUser,
                });
                if (!isFirstUser) {
                    // Notify Admin
                    const emailToken = (0, adminController_1.generateEmailActionToken)(String(dbUser._id), dbUser.name, dbUser.email);
                    await (0, emailService_1.sendAdminRegistrationRequest)({ name: dbUser.name, email: dbUser.email }, emailToken);
                    // Create Bell Notification for Admins
                    try {
                        const admins = await User_1.User.find({ role: 'Admin' });
                        for (const admin of admins) {
                            await Notification_1.Notification.create({
                                userId: admin._id,
                                title: 'New User Registration Request',
                                message: `A new user ${dbUser.name} (${dbUser.email}) has requested access.`,
                                type: 'request',
                            });
                        }
                    }
                    catch (err) {
                        logger_1.default.error('Failed to create admin notification:', err.message);
                    }
                }
            }
        }
        // Check approval status
        if (!dbUser.approved) {
            if (dbUser.status === 'Rejected') {
                (0, response_1.sendError)(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
                return;
            }
            (0, response_1.sendError)(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
            return;
        }
        // Generate custom JWT
        const token = jsonwebtoken_1.default.sign({
            uid: firebaseUid,
            email: dbUser.email,
            name: dbUser.name,
            photoURL: dbUser.photoURL,
            role: dbUser.role,
            status: dbUser.status,
            approved: dbUser.approved,
        }, env_1.config.jwtSecret, { expiresIn: '7d' });
        (0, response_1.sendSuccess)(res, 'Google authentication verified successfully.', {
            user: {
                _id: dbUser._id,
                name: dbUser.name,
                email: dbUser.email,
                photoURL: dbUser.photoURL,
                status: dbUser.status,
                role: dbUser.role,
                approved: dbUser.approved,
                createdAt: dbUser.createdAt,
            },
            token,
        });
    }
    catch (error) {
        logger_1.default.error('Google login verification failed:', error.message);
        (0, response_1.sendError)(res, 'Google authentication failed.', error.message || error, 401);
    }
};
exports.googleLogin = googleLogin;
/**
 * Logout User
 * POST /api/auth/logout
 */
const logout = async (_req, res) => {
    (0, response_1.sendSuccess)(res, 'Logged out successfully.', {});
};
exports.logout = logout;
