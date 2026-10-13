"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI;
async function checkUsers() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI missing');
        process.exit(1);
    }
    await mongoose_1.default.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');
    const db = mongoose_1.default.connection.db;
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
    await mongoose_1.default.disconnect();
}
checkUsers().catch(console.error);
