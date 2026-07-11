"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGroqInitialized = exports.groq = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("./env");
let groq = null;
exports.groq = groq;
let isGroqInitialized = false;
exports.isGroqInitialized = isGroqInitialized;
try {
    if (env_1.config.groqApiKey && env_1.config.groqApiKey !== 'mock-or-replace-with-real-key') {
        exports.groq = groq = new groq_sdk_1.default({ apiKey: env_1.config.groqApiKey });
        exports.isGroqInitialized = isGroqInitialized = true;
        console.log('[Groq] Groq SDK client initialized successfully.');
    }
    else {
        throw new Error('Missing or default GROQ_API_KEY environment variable.');
    }
}
catch (error) {
    console.error('\x1b[31m[Groq] Failed to initialize Groq SDK:\x1b[0m', error.message);
    console.warn('\x1b[33m[Groq] Groq sentiment analysis API will return mock responses.\x1b[0m');
}
