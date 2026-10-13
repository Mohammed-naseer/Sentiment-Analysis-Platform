"use strict";
/**
 * Hugging Face Configuration
 * ─────────────────────────────────────────────────────────────
 * Uses the official @huggingface/inference InferenceClient.
 * Backward-compatible: reads HUGGINGFACE_API_KEY (existing name).
 * Model is configurable via HF_MODEL env var.
 *
 * No token is ever logged.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.huggingFaceConfig = void 0;
const inference_1 = require("@huggingface/inference");
const env_1 = require("./env");
let hfClient = null;
let isHuggingFaceInitialized = false;
try {
    if (env_1.config.hfToken && env_1.config.hfToken !== 'mock-or-replace-with-real-key') {
        hfClient = new inference_1.InferenceClient(env_1.config.hfToken);
        isHuggingFaceInitialized = true;
        console.log('[HuggingFace] InferenceClient initialized successfully.');
    }
    else {
        throw new Error('Missing or default HUGGINGFACE_API_KEY environment variable.');
    }
}
catch (error) {
    console.error('\x1b[31m[HuggingFace] Failed to configure Hugging Face:\x1b[0m', error.message);
    console.warn('\x1b[33m[HuggingFace] Hugging Face sentiment API will return mock responses.\x1b[0m');
}
exports.huggingFaceConfig = {
    isInitialized: isHuggingFaceInitialized,
    hfModel: env_1.config.hfModel,
    /** InferenceClient instance — use for all requests, never expose the token */
    client: hfClient,
};
