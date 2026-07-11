import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import path from 'path';
// Load .env from the backend root (cwd when running from backend folder)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


import * as admin from 'firebase-admin';
import mongoose from 'mongoose';
import { User } from '../models/User';

// ─── Config ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'mohammednaseer22022@gmail.com';
const ADMIN_PASSWORD = 'naseer@7013722022';
const ADMIN_NAME     = 'Mohammed Naseer';
const MONGODB_URI    = process.env.MONGODB_URI!;
const FIREBASE_PROJECT_ID  = process.env.FIREBASE_PROJECT_ID!;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!;
const FIREBASE_PRIVATE_KEY  = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

// ─── Init Firebase Admin ────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
});

async function seedAdmin() {
  console.log('\n🌱 Starting Admin Seed Script...\n');

  // 1. Connect MongoDB
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ MongoDB connected\n');

  // 2. Create or update Firebase user
  let firebaseUid: string;
  try {
    const existing = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    firebaseUid = existing.uid;
    console.log(`🔥 Firebase user already exists (uid: ${firebaseUid})`);

    // Update password
    await admin.auth().updateUser(firebaseUid, { password: ADMIN_PASSWORD });
    console.log('✅ Firebase password updated\n');
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
      });
      firebaseUid = created.uid;
      console.log(`✅ Firebase user created (uid: ${firebaseUid})\n`);
    } else {
      throw err;
    }
  }

  // 3. Set Firebase custom claim: admin role
  await admin.auth().setCustomUserClaims(firebaseUid, { role: 'Admin' });
  console.log('✅ Firebase custom claim set: role=Admin\n');

  // 4. Upsert user in MongoDB with Admin role
  const mongoUser = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        firebaseUid,
        role: 'Admin',
        status: 'Approved',
        approved: true,
        rejectionReason: '',
      },
    },
    { upsert: true, new: true }
  );

  console.log('✅ MongoDB admin user upserted:');
  console.log(`   Email  : ${mongoUser.email}`);
  console.log(`   Role   : ${mongoUser.role}`);
  console.log(`   Status : ${mongoUser.status}`);
  console.log(`   UID    : ${mongoUser.firebaseUid}\n`);

  console.log('🎉 Admin seed complete!\n');
  console.log('─────────────────────────────────────');
  console.log(`  Email    : ${ADMIN_EMAIL}`);
  console.log(`  Password : ${ADMIN_PASSWORD}`);
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
