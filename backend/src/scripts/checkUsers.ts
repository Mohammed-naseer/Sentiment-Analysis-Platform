import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { User } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI!;

async function checkUser() {
  console.log('\n🔍 Checking admin user in MongoDB...\n');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ MongoDB connected\n');

  const users = await User.find({}).lean();
  console.log(`📋 Total users in DB: ${users.length}\n`);
  
  users.forEach((u: any) => {
    console.log('─────────────────────────────────────');
    console.log(`  Name     : ${u.name}`);
    console.log(`  Email    : ${u.email}`);
    console.log(`  Role     : ${u.role}`);
    console.log(`  Status   : ${u.status}`);
    console.log(`  Approved : ${u.approved}`);
    console.log(`  Firebase : ${u.firebaseUid}`);
    console.log('─────────────────────────────────────\n');
  });

  await mongoose.disconnect();
  process.exit(0);
}

checkUser().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
