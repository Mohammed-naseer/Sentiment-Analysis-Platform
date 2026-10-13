"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from the backend root (cwd when running from backend folder)
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const admin = __importStar(require("firebase-admin"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
// ─── Config ────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'mohammednaseer22022@gmail.com';
const ADMIN_PASSWORD = 'naseer@7013722022';
const ADMIN_NAME = 'Mohammed Naseer';
const MONGODB_URI = process.env.MONGODB_URI;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
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
    await mongoose_1.default.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB connected\n');
    // 2. Create or update Firebase user
    let firebaseUid;
    try {
        const existing = await admin.auth().getUserByEmail(ADMIN_EMAIL);
        firebaseUid = existing.uid;
        console.log(`🔥 Firebase user already exists (uid: ${firebaseUid})`);
        // Update password
        await admin.auth().updateUser(firebaseUid, { password: ADMIN_PASSWORD });
        console.log('✅ Firebase password updated\n');
    }
    catch (err) {
        if (err.code === 'auth/user-not-found') {
            const created = await admin.auth().createUser({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                displayName: ADMIN_NAME,
                emailVerified: true,
            });
            firebaseUid = created.uid;
            console.log(`✅ Firebase user created (uid: ${firebaseUid})\n`);
        }
        else {
            throw err;
        }
    }
    // 3. Set Firebase custom claim: admin role
    await admin.auth().setCustomUserClaims(firebaseUid, { role: 'Admin' });
    console.log('✅ Firebase custom claim set: role=Admin\n');
    // 4. Upsert user in MongoDB with Admin role
    const mongoUser = await User_1.User.findOneAndUpdate({ email: ADMIN_EMAIL }, {
        $set: {
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            firebaseUid,
            role: 'Admin',
            status: 'Approved',
            approved: true,
            rejectionReason: '',
        },
    }, { upsert: true, new: true });
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
    await mongoose_1.default.disconnect();
    process.exit(0);
}
seedAdmin().catch((err) => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
