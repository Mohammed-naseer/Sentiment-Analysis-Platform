"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_for_backup_auth',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_sentiment',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
    firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : '',
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || '',
        adminEmail: process.env.ADMIN_EMAIL || '',
    },
};
// Simple configuration checker
const validateConfig = () => {
    const missingConfigs = [];
    if (!exports.config.mongodbUri || exports.config.mongodbUri.includes('username')) {
        missingConfigs.push('MONGODB_URI');
    }
    if (!exports.config.geminiApiKey || exports.config.geminiApiKey === 'mock-or-replace-with-real-key') {
        missingConfigs.push('GEMINI_API_KEY');
    }
    if (!exports.config.groqApiKey || exports.config.groqApiKey === 'mock-or-replace-with-real-key') {
        missingConfigs.push('GROQ_API_KEY');
    }
    if (!exports.config.huggingfaceApiKey || exports.config.huggingfaceApiKey === 'mock-or-replace-with-real-key') {
        missingConfigs.push('HUGGINGFACE_API_KEY');
    }
    if (!exports.config.firebase.projectId || exports.config.firebase.projectId === 'mock-firebase-project-id') {
        missingConfigs.push('FIREBASE_PROJECT_ID');
    }
    if (!exports.config.smtp.user || !exports.config.smtp.pass || exports.config.smtp.pass === 'your_16_char_app_password_here') {
        missingConfigs.push('SMTP_USER / SMTP_PASS (email will be simulated to console)');
    }
    if (missingConfigs.length > 0) {
        console.warn(`\x1b[33m[WARNING] The following environment variables are missing or use default mock values: ${missingConfigs.join(', ')}. Some services might fail to run correctly.\x1b[0m`);
    }
    else {
        console.log('\x1b[32m[INFO] All environment variables are correctly configured.\x1b[0m');
    }
};
exports.validateConfig = validateConfig;
