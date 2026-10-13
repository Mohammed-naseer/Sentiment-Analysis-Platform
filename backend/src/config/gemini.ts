/**
 * Gemini Configuration
 * ─────────────────────────────────────────────────────────────
 * Uses @google/genai SDK with async model auto-discovery.
 *
 * If GEMINI_MODEL is set in .env that model is used directly.
 * Otherwise, models are probed in real-time until a model
 * returns a successful response for the user's API key.
 *
 * The resolved model name is exported as resolvedGeminiModel
 * (a Promise<string>) — services await it on first use.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from './env';

// ─── Priority list of models to probe (tried in order) ─────────────────────
const MODEL_PRIORITY: string[] = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

let genAI: GoogleGenAI | null = null;
let isGeminiInitialized = false;

let _resolveModel: (model: string) => void;
let _rejectModel: (err: Error) => void;

export const resolvedGeminiModel: Promise<string> = new Promise((res, rej) => {
  _resolveModel = res;
  _rejectModel = rej;
});

async function initGemini(): Promise<void> {
  if (!config.geminiApiKey || config.geminiApiKey === 'mock-or-replace-with-real-key') {
    console.error('\x1b[31m[Gemini] GEMINI_API_KEY is missing — Gemini will be unavailable.\x1b[0m');
    _rejectModel(new Error('MISSING_API_KEY'));
    return;
  }

  try {
    genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });
    isGeminiInitialized = true;
    console.log('[Gemini] SDK initialized. Auto-discovering working model…');
  } catch (err: any) {
    console.error('\x1b[31m[Gemini] Failed to init SDK:\x1b[0m', err.message);
    _rejectModel(new Error(`SDK_INIT_FAILED: ${err.message}`));
    return;
  }

  // If user pinned a specific model in .env, use it directly
  if (config.geminiModel) {
    console.log(`[Gemini] Using pinned model from GEMINI_MODEL: ${config.geminiModel}`);
    _resolveModel(config.geminiModel);
    return;
  }

  // Real-time probing: probe candidates in priority order until one succeeds
  for (const model of MODEL_PRIORITY) {
    try {
      const resp = await genAI.models.generateContent({
        model,
        contents: 'test',
        config: { maxOutputTokens: 2 },
      });
      if (resp && resp.text !== undefined) {
        console.log(`\x1b[32m[Gemini] Auto-discovered working model: ${model}\x1b[0m`);
        _resolveModel(model);
        return;
      }
    } catch {
      // Model unavailable or quota exceeded for this key — try next
    }
  }

  // Secondary discovery: if none in priority worked, list available models and probe them
  try {
    const pager = await genAI.models.list();
    for await (const m of pager) {
      if (!m.name) continue;
      const modelCandidate = m.name.replace(/^models\//, '');
      if (!modelCandidate.includes('gemini') || MODEL_PRIORITY.includes(modelCandidate)) continue;
      try {
        const resp = await genAI.models.generateContent({
          model: modelCandidate,
          contents: 'test',
          config: { maxOutputTokens: 2 },
        });
        if (resp && resp.text !== undefined) {
          console.log(`\x1b[32m[Gemini] Auto-discovered working model (from list): ${modelCandidate}\x1b[0m`);
          _resolveModel(modelCandidate);
          return;
        }
      } catch {
        // try next candidate
      }
    }
  } catch (listErr: any) {
    console.warn(`[Gemini] Model list API fallback failed: ${listErr.message}`);
  }

  console.error('\x1b[31m[Gemini] No working model found for this API key.\x1b[0m');
  _rejectModel(new Error('NO_AVAILABLE_MODEL'));
}

initGemini().catch(() => {});

export { genAI, isGeminiInitialized };
