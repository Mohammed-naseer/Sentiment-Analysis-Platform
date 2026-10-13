"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const MONGODB_URI = process.env.MONGODB_URI;
async function checkUser() {
    console.log('\n🔍 Checking admin user in MongoDB...\n');
    await mongoose_1.default.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB connected\n');
    const users = await User_1.User.find({}).lean();
    console.log(`📋 Total users in DB: ${users.length}\n`);
    users.forEach((u) => {
        console.log('─────────────────────────────────────');
        console.log(`  Name     : ${u.name}`);
        console.log(`  Email    : ${u.email}`);
        console.log(`  Role     : ${u.role}`);
        console.log(`  Status   : ${u.status}`);
        console.log(`  Approved : ${u.approved}`);
        console.log(`  Firebase : ${u.firebaseUid}`);
        console.log('─────────────────────────────────────\n');
    });
    await mongoose_1.default.disconnect();
    process.exit(0);
}
checkUser().catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
