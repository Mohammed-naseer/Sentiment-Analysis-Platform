import * as admin from 'firebase-admin';
import { config } from './env';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let isFirebaseInitialized = false;

try {
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    db = admin.firestore();
    auth = admin.auth();
    isFirebaseInitialized = true;
    console.log('[Firebase] Admin SDK initialized successfully.');
  } else {
    throw new Error('Missing Firebase configuration variables in environment.');
  }
} catch (error: any) {
  console.error('\x1b[31m[Firebase] Failed to initialize Firebase Admin SDK:\x1b[0m', error.message);
  console.warn('\x1b[33m[Firebase] Running in MOCK/DEGRADED mode. Firestore & Auth operations will fail.\x1b[0m');
  
  // Create mock objects so import references don't crash the app on startup
  db = {} as any;
  auth = {} as any;
}

export { admin, db, auth, isFirebaseInitialized };
