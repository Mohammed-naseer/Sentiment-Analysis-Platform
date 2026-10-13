import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { auth, isFirebaseInitialized } from '../config/firebase';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { config } from '../config/env';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';
import { sendAdminRegistrationRequest } from '../services/emailService';
import { generateEmailActionToken } from '../controllers/adminController';

/**
 * Register User
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name, photoURL } = req.body;

  try {
    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      sendError(res, 'User with this email already exists.', 'EmailConflictError', 400);
      return;
    }

    let firebaseUid = `mock_${Date.now()}`;

    if (isFirebaseInitialized) {
      try {
        // Create user in Firebase Authentication
        const firebaseUser = await auth.createUser({
          email,
          password,
          displayName: name,
          ...(photoURL ? { photoURL } : {}),
        });
        firebaseUid = firebaseUser.uid;
      } catch (fbError: any) {
        logger.error('Firebase Auth registration failed:', fbError.message);
        
        // If the email is already in use, suggest logging in
        const isEmailExists = fbError.code === 'auth/email-already-exists' || fbError.message?.includes('already in use') || fbError.message?.includes('already exists');
        if (isEmailExists) {
          sendError(res, 'Email is already registered.', 'Please log in instead.', 400);
          return;
        }

        // If it is a network or ssl/tls handshake error, fallback to local registration
        const isNetworkErr = fbError.message?.includes('SSL') || fbError.message?.includes('network') || fbError.message?.includes('ECONNREFUSED') || fbError.message?.includes('alert');
        if (isNetworkErr) {
          logger.warn('SSL/Network error encountered with Firebase. Falling back to local registration.');
          firebaseUid = `mock_uid_${email.replace(/[@.]/g, '_')}`;
        } else {
          sendError(res, 'Firebase Auth registration failed.', fbError.message || fbError, 400);
          return;
        }
      }
    }

    // Self-bootstrapping logic: First user in database is automatically approved as Admin
    const userCount = await User.countDocuments({});
    const isFirstUser = userCount === 0;

    const status = isFirstUser ? 'Approved' : 'Pending';
    const role = isFirstUser ? 'Admin' : 'Pending';
    const approved = isFirstUser;

    // Save profile to MongoDB Atlas Database
    const newUser = await User.create({
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
      const emailToken = generateEmailActionToken(String(newUser._id), newUser.name, newUser.email);
      await sendAdminRegistrationRequest({ name: newUser.name, email: newUser.email }, emailToken);

      // Create Bell Notification in DB for all Admin users
      try {
        const admins = await User.find({ role: 'Admin' });
        for (const admin of admins) {
          await Notification.create({
            userId: admin._id,
            title: 'New User Registration Request',
            message: `A new user ${newUser.name} (${newUser.email}) has requested access.`,
            type: 'request',
          });
        }
      } catch (err: any) {
        logger.error('Failed to create admin registration notification:', err.message);
      }
    }

    // Generate local JWT token (only if approved/first user, otherwise send null)
    let token: string | null = null;
    if (approved) {
      token = jwt.sign(
        {
          uid: firebaseUid,
          email: newUser.email,
          name: newUser.name,
          photoURL: newUser.photoURL,
          role: newUser.role,
          status: newUser.status,
          approved: newUser.approved,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
    }

    sendSuccess(res, isFirstUser ? 'First user registered and approved as Admin successfully.' : 'Registration request submitted successfully. Awaiting administrator approval.', {
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
  } catch (error: any) {
    logger.error('Registration failed:', error.message);
    sendError(res, 'Registration failed.', error.message || error, 500);
  }
};

/**
 * Login User
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required.', 'ValidationError', 400);
    return;
  }

  try {
    // 1. Password verification via Firebase Auth Identity Toolkit REST API
    let passwordVerified = false;

    if (config.firebaseWebApiKey) {
      try {
        const fbAuthRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.firebaseWebApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase(), password, returnSecureToken: true }),
          }
        );
        const fbAuthData: any = await fbAuthRes.json();
        if (fbAuthRes.ok && fbAuthData?.idToken) {
          passwordVerified = true;
        } else {
          const errorMsg = fbAuthData?.error?.message;
          if (
            errorMsg === 'INVALID_LOGIN_CREDENTIALS' ||
            errorMsg === 'EMAIL_NOT_FOUND' ||
            errorMsg === 'INVALID_PASSWORD'
          ) {
            sendError(res, 'Invalid email or password.', 'InvalidCredentialsError', 401);
            return;
          }
        }
      } catch (fbNetErr: any) {
        logger.warn('[Auth] Firebase REST Auth network error, evaluating fallback auth:', fbNetErr.message);
      }
    }

    // 2. Fallback check for offline / local in-memory DB accounts
    // Only accept the known dev admin credentials in offline mode.
    // DO NOT allow any 6+ char password for arbitrary accounts — that bypasses authentication.
    if (!passwordVerified) {
      const isKnownDevAdmin =
        email.toLowerCase() === 'mohammednaseer22022@gmail.com' &&
        password === 'naseer@7013722022';
      if (isKnownDevAdmin) {
        passwordVerified = true;
      }
      // All other accounts require Firebase to be online for password verification.
      // No insecure fallback that accepts any password.
    }

    if (!passwordVerified) {
      sendError(res, 'Invalid email or password.', 'InvalidCredentialsError', 401);
      return;
    }

    // 3. Find user in MongoDB
    let dbUser = await User.findOne({ email: email.toLowerCase() });

    if (!dbUser) {
      // If Firebase is initialized, check if user exists there
      if (isFirebaseInitialized) {
        try {
          const fbUser = await auth.getUserByEmail(email);
          const userCount = await User.countDocuments({});
          const isFirstUser = userCount === 0 || email.toLowerCase() === 'mohammednaseer22022@gmail.com';

          // Sync existing Firebase user to MongoDB
          dbUser = await User.create({
            name: fbUser.displayName || email.split('@')[0],
            email: email.toLowerCase(),
            firebaseUid: fbUser.uid,
            photoURL: fbUser.photoURL || '',
            status: isFirstUser ? 'Approved' : 'Pending',
            role: isFirstUser ? 'Admin' : 'Pending',
            approved: isFirstUser,
          });
        } catch (fbError: any) {
          sendError(res, 'User record not found. Please register.', 'UserNotFoundError', 404);
          return;
        }
      } else {
        sendError(res, 'User record not found. Please register.', 'UserNotFoundError', 404);
        return;
      }
    }

    // Check approval status
    if (!dbUser.approved) {
      if (dbUser.status === 'Rejected') {
        sendError(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
        return;
      }
      sendError(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
      return;
    }

    // Generate local JWT token
    const token = jwt.sign(
      {
        uid: dbUser.firebaseUid,
        email: dbUser.email,
        name: dbUser.name,
        photoURL: dbUser.photoURL,
        role: dbUser.role,
        status: dbUser.status,
        approved: dbUser.approved,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    sendSuccess(res, 'Login successful.', {
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
  } catch (error: any) {
    logger.error('Login failed:', error.message);
    sendError(res, 'Login failed.', error.message || error, 500);
  }
};

/**
 * Verify Google ID Token
 * POST /api/auth/google
 */
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body;

  try {
    let firebaseUid = '';
    let email = '';
    let name = '';
    let photoURL = '';

    if (isFirebaseInitialized) {
      // Verify ID Token with Firebase Auth Admin SDK
      const decodedToken = await auth.verifyIdToken(idToken);
      firebaseUid = decodedToken.uid;
      email = decodedToken.email || '';
      name = decodedToken.name || '';
      photoURL = decodedToken.picture || '';
    } else {
      // Mock validation for local development
      logger.warn('[Auth] Google Login: Firebase not initialized. Using simulated ID token verification.');
      firebaseUid = 'mock_google_user_12345';
      email = 'google.user@example.com';
      name = 'Google User';
      photoURL = 'https://lh3.googleusercontent.com/a/default-user';
    }

    // Find or sync MongoDB User Profile
    let dbUser = await User.findOne({ firebaseUid });

    if (!dbUser) {
      dbUser = await User.findOne({ email: email.toLowerCase() });
      if (dbUser) {
        dbUser.firebaseUid = firebaseUid;
        if (photoURL && !dbUser.photoURL) dbUser.photoURL = photoURL;
        await dbUser.save();
      } else {
        const userCount = await User.countDocuments({});
        const isFirstUser = userCount === 0;

        dbUser = await User.create({
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
          const emailToken = generateEmailActionToken(String(dbUser._id), dbUser.name, dbUser.email);
          await sendAdminRegistrationRequest({ name: dbUser.name, email: dbUser.email }, emailToken);
          // Create Bell Notification for Admins
          try {
            const admins = await User.find({ role: 'Admin' });
            for (const admin of admins) {
              await Notification.create({
                userId: admin._id,
                title: 'New User Registration Request',
                message: `A new user ${dbUser.name} (${dbUser.email}) has requested access.`,
                type: 'request',
              });
            }
          } catch (err: any) {
            logger.error('Failed to create admin notification:', err.message);
          }
        }
      }
    }

    // Check approval status
    if (!dbUser.approved) {
      if (dbUser.status === 'Rejected') {
        sendError(res, 'Your registration request has been rejected.', 'RequestRejectedError', 403);
        return;
      }
      sendError(res, 'Your account is awaiting administrator approval.', 'AwaitingApprovalError', 403);
      return;
    }

    // Generate custom JWT
    const token = jwt.sign(
      {
        uid: firebaseUid,
        email: dbUser.email,
        name: dbUser.name,
        photoURL: dbUser.photoURL,
        role: dbUser.role,
        status: dbUser.status,
        approved: dbUser.approved,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    sendSuccess(res, 'Google authentication verified successfully.', {
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
  } catch (error: any) {
    logger.error('Google login verification failed:', error.message);
    sendError(res, 'Google authentication failed.', error.message || error, 401);
  }
};

/**
 * Logout User
 * POST /api/auth/logout
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 'Logged out successfully.', {});
};
