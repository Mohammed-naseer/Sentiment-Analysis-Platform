import { config } from './env';

let isHuggingFaceInitialized = false;

try {
  if (config.huggingfaceApiKey && config.huggingfaceApiKey !== 'mock-or-replace-with-real-key') {
    isHuggingFaceInitialized = true;
    console.log('[HuggingFace] Hugging Face client configured successfully.');
  } else {
    throw new Error('Missing or default HUGGINGFACE_API_KEY environment variable.');
  }
} catch (error: any) {
  console.error('\x1b[31m[HuggingFace] Failed to configure Hugging Face:\x1b[0m', error.message);
  console.warn('\x1b[33m[HuggingFace] Hugging Face sentiment API will return mock responses.\x1b[0m');
}

export const huggingFaceConfig = {
  apiKey: config.huggingfaceApiKey,
  isInitialized: isHuggingFaceInitialized,
  sentimentModel: 'distilbert-base-uncased-finetuned-sst-2-english', // standard model
  apiUrl: 'https://api-inference.huggingface.co/models/'
};
