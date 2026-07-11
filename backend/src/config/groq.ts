import Groq from 'groq-sdk';
import { config } from './env';

let groq: Groq | null = null;
let isGroqInitialized = false;

try {
  if (config.groqApiKey && config.groqApiKey !== 'mock-or-replace-with-real-key') {
    groq = new Groq({ apiKey: config.groqApiKey });
    isGroqInitialized = true;
    console.log('[Groq] Groq SDK client initialized successfully.');
  } else {
    throw new Error('Missing or default GROQ_API_KEY environment variable.');
  }
} catch (error: any) {
  console.error('\x1b[31m[Groq] Failed to initialize Groq SDK:\x1b[0m', error.message);
  console.warn('\x1b[33m[Groq] Groq sentiment analysis API will return mock responses.\x1b[0m');
}

export { groq, isGroqInitialized };
