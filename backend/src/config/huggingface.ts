/**
 * Hugging Face Configuration
 * ─────────────────────────────────────────────────────────────
 * Uses the official @huggingface/inference InferenceClient.
 * Backward-compatible: reads HUGGINGFACE_API_KEY (existing name).
 * Model is configurable via HF_MODEL env var.
 *
 * No token is ever logged.
 */

import { InferenceClient } from '@huggingface/inference';
import { config } from './env';

let hfClient: InferenceClient | null = null;
let isHuggingFaceInitialized = false;

try {
  if (config.hfToken && config.hfToken !== 'mock-or-replace-with-real-key') {
    hfClient = new InferenceClient(config.hfToken);
    isHuggingFaceInitialized = true;
    console.log('[HuggingFace] InferenceClient initialized successfully.');
  } else {
    throw new Error('Missing or default HUGGINGFACE_API_KEY environment variable.');
  }
} catch (error: any) {
  console.error('\x1b[31m[HuggingFace] Failed to configure Hugging Face:\x1b[0m', error.message);
  console.warn('\x1b[33m[HuggingFace] Hugging Face sentiment API will return mock responses.\x1b[0m');
}

export const huggingFaceConfig = {
  isInitialized: isHuggingFaceInitialized,
  hfModel: config.hfModel,
  /** InferenceClient instance — use for all requests, never expose the token */
  client: hfClient,
};
