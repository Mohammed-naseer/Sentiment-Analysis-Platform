import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './env';

let genAI: GoogleGenerativeAI | null = null;
let isGeminiInitialized = false;

try {
  if (config.geminiApiKey && config.geminiApiKey !== 'mock-or-replace-with-real-key') {
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
    isGeminiInitialized = true;
    console.log('[Gemini] Google Generative AI client initialized successfully.');
  } else {
    throw new Error('Missing or default GEMINI_API_KEY environment variable.');
  }
} catch (error: any) {
  console.error('\x1b[31m[Gemini] Failed to initialize Gemini API Client:\x1b[0m', error.message);
  console.warn('\x1b[33m[Gemini] Sentiment analysis APIs will return mock responses.\x1b[0m');
}

export { genAI, isGeminiInitialized };
