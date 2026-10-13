import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import mongoose from 'mongoose';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUsers() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const db = mongoose.connection.db;
  const users = await db?.collection('users').find({}).toArray();

  console.log('\n================================================================');
  console.log(`FOUND ${users?.length || 0} USERS IN DATABASE:`);
  console.log('================================================================');

  if (users) {
    for (const u of users) {
      console.log(`- Email   : ${u.email}`);
      console.log(`  Role    : ${u.role}`);
      console.log(`  Approved: ${u.approved}`);
      console.log(`  Status  : ${u.status}`);
      console.log('----------------------------------------------------------------');
    }
  }

  await mongoose.disconnect();
}

checkUsers().catch(console.error);
