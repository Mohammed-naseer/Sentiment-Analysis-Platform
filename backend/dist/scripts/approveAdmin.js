"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
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
        await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 15000 });
        console.log('✅ Connected to MongoDB Atlas');
        // Approve the admin user mohammednaseer22022@gmail.com
        const adminUser = await User_1.User.findOneAndUpdate({ email: 'mohammednaseer22022@gmail.com' }, {
            $set: {
                name: 'Mohammed Naseer',
                email: 'mohammednaseer22022@gmail.com',
                role: 'Admin',
                status: 'Approved',
                approved: true,
            },
        }, { upsert: true, new: true });
        console.log('✅ Admin User Status in MongoDB:');
        console.log(`   Email   : ${adminUser.email}`);
        console.log(`   Role    : ${adminUser.role}`);
        console.log(`   Status  : ${adminUser.status}`);
        console.log(`   Approved: ${adminUser.approved}`);
        // Also approve all pending users for local testing smooth access
        const result = await User_1.User.updateMany({}, { $set: { status: 'Approved', approved: true } });
        console.log(`\n✅ Total users set to Approved: ${result.modifiedCount || 0}`);
        await mongoose_1.default.disconnect();
        console.log('================================================================\n');
    }
    catch (err) {
        console.error('❌ Error updating MongoDB users:', err.message);
        process.exit(1);
    }
}
approveAdmin();
