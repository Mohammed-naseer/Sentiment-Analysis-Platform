"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGeminiInitialized = exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("./env");
let genAI = null;
exports.genAI = genAI;
let isGeminiInitialized = false;
exports.isGeminiInitialized = isGeminiInitialized;
try {
    if (env_1.config.geminiApiKey && env_1.config.geminiApiKey !== 'mock-or-replace-with-real-key') {
        exports.genAI = genAI = new generative_ai_1.GoogleGenerativeAI(env_1.config.geminiApiKey);
        exports.isGeminiInitialized = isGeminiInitialized = true;
        console.log('[Gemini] Google Generative AI client initialized successfully.');
    }
    else {
        throw new Error('Missing or default GEMINI_API_KEY environment variable.');
    }
}
catch (error) {
    console.error('\x1b[31m[Gemini] Failed to initialize Gemini API Client:\x1b[0m', error.message);
    console.warn('\x1b[33m[Gemini] Sentiment analysis APIs will return mock responses.\x1b[0m');
}
