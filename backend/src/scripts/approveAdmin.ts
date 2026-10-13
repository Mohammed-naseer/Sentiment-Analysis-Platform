import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { User } from '../models/User';

async function approveAdmin() {
  console.log('================================================================');
  console.log('       APPROVING ADMIN & VERIFYING MONGODB USER ACCOUNTS       ');
  console.log('================================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB Atlas');

    // Approve the admin user mohammednaseer22022@gmail.com
    const adminUser = await User.findOneAndUpdate(
      { email: 'mohammednaseer22022@gmail.com' },
      {
        $set: {
          name: 'Mohammed Naseer',
          email: 'mohammednaseer22022@gmail.com',
          role: 'Admin',
          status: 'Approved',
          approved: true,
        },
      },
      { upsert: true, new: true }
    );

    console.log('✅ Admin User Status in MongoDB:');
    console.log(`   Email   : ${adminUser.email}`);
    console.log(`   Role    : ${adminUser.role}`);
    console.log(`   Status  : ${adminUser.status}`);
    console.log(`   Approved: ${adminUser.approved}`);

    // Also approve all pending users for local testing smooth access
    const result = await User.updateMany(
      {},
      { $set: { status: 'Approved', approved: true } }
    );
    console.log(`\n✅ Total users set to Approved: ${result.modifiedCount || 0}`);

    await mongoose.disconnect();
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('❌ Error updating MongoDB users:', err.message);
    process.exit(1);
  }
}

approveAdmin();
