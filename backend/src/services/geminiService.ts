import { genAI, isGeminiInitialized, resolvedGeminiModel } from '../config/gemini';
import logger from '../utils/logger';

export interface AspectSentimentItem {
  aspect: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number; // 0.0 - 1.0
  evidence: string;
}

export interface ModelSentimentResult {
  sentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  confidence: number; // 0 – 100
  emotion: string;
  emotionConfidence?: number; // 0 – 100
  summary: string;
  aspects?: AspectSentimentItem[];
  status?: 'success' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  model?: string;
}

export const sanitizeSentiment = (val: string): 'Positive' | 'Negative' | 'Neutral' | 'Mixed' => {
  const norm = String(val || '').trim().toLowerCase();
  if (norm.includes('mix')) return 'Mixed';
  if (norm.includes('pos')) return 'Positive';
  if (norm.includes('neg')) return 'Negative';
  return 'Neutral';
};

/**
 * Analyze Sentiment & Granular Aspects using Gemini API.
 */
export const analyzeWithGemini = async (text: string, requestId?: string): Promise<ModelSentimentResult> => {
  const startTime = Date.now();
  const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (!isGeminiInitialized || !genAI) {
    logger.warn('[GeminiService] Gemini SDK not initialized.');
    return failResult('Gemini', 'SDK_NOT_INITIALIZED', 'SDK not initialized with valid API key', reqId, startTime);
  }

  let activeModel: string;
  try {
    activeModel = await resolvedGeminiModel;
  } catch (err: any) {
    logger.warn(`[GeminiService] No Gemini model available — ${err.message}`);
    return failResult('Gemini', 'NO_AVAILABLE_MODEL', err.message, reqId, startTime);
  }

  try {
    const prompt = `Analyze the sentiment, emotions, and specific product/service aspects in this customer review:

"${text.length > 8000 ? text.slice(0, 8000) : text}"

Return a single JSON object with this exact structure:
{
  "sentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "confidence": <integer 0 to 100 representing certainty percentage>,
  "emotion": "<primary emotion word, e.g. Frustrated, Happy, Satisfied, Concerned, Anger, Disappointment, Excited, Neutral>",
  "emotionConfidence": <integer 0 to 100 representing emotional signal certainty>,
  "summary": "<concise 1-sentence explanation of why that sentiment/emotion was chosen>",
  "aspects": [
    {
      "aspect": "<Aspect name, e.g. Design, Display, Camera, Battery, Heating, Software, Support, Delivery, Packaging, Build Quality>",
      "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "confidence": <float 0.0 to 1.0>,
      "evidence": "<exact verbatim quote from text supporting this aspect>"
    }
  ]
}
If a review contains both substantial positive points and negative issues, set sentiment to "Mixed".
Do NOT return markdown fences or other text. Return raw JSON only.`;

    const response = await genAI.models.generateContent({
      model: activeModel,
      contents: prompt,
    });

    const latencyMs = Date.now() - startTime;
    const responseText = response.text;
    if (!responseText) throw new Error('Empty response from Gemini API.');

    // Clean JSON response
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const result: ModelSentimentResult = {
      sentiment: sanitizeSentiment(parsed.sentiment),
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.confidence))) : 75,
      emotion: parsed.emotion || 'Neutral',
      emotionConfidence: typeof parsed.emotionConfidence === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.emotionConfidence))) : 80,
      summary: parsed.summary || `Gemini (${activeModel}) analyzed the review.`,
      aspects: Array.isArray(parsed.aspects) ? parsed.aspects.map((a: any) => ({
        aspect: String(a.aspect || 'General'),
        sentiment: (String(a.sentiment || 'NEUTRAL').toUpperCase() as any),
        confidence: typeof a.confidence === 'number' ? Math.min(1, Math.max(0, a.confidence)) : 0.8,
        evidence: String(a.evidence || ''),
      })) : [],
      status: 'success',
      latencyMs,
      model: activeModel,
    };

    logger.info('[GeminiService] Structured Provider Log:', {
      provider: 'Gemini',
      requestId: reqId,
      status: 'success',
      latency: `${latencyMs}ms`,
      model: activeModel,
      sentiment: result.sentiment,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error: any) {
    logger.error(`[GeminiService] Error calling Gemini (${activeModel}):`, error.message);
    return failResult('Gemini', 'PROVIDER_ERROR', error.message, reqId, startTime, activeModel);
  }
};

export const getMockResult = (_text: string, provider: string): ModelSentimentResult => {
  return failResult(provider, 'UNAVAILABLE', `${provider} is temporarily unavailable`, 'mock_id', Date.now());
};

function failResult(
  provider: string,
  errorCode: string,
  rawReason: string,
  requestId: string,
  startTime: number,
  model?: string
): ModelSentimentResult {
  const latencyMs = Date.now() - startTime;
  // Clean message: never leak keys or auth tokens
  let safeReason = rawReason || 'Provider failed to respond';
  if (safeReason.includes('API key') || safeReason.includes('auth')) {
    safeReason = 'Authentication credentials rejected by provider';
  } else if (safeReason.includes('404') || safeReason.includes('not found')) {
    safeReason = 'Configured AI model endpoint is not found or unsupported';
  } else if (safeReason.includes('429') || safeReason.includes('quota')) {
    safeReason = 'Provider rate limit or quota exceeded';
  }

  logger.warn('[GeminiService] Structured Provider Failure Log:', {
    provider,
    requestId,
    status: 'failed',
    latency: `${latencyMs}ms`,
    errorCode,
    errorMessage: safeReason,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
  });

  return {
    sentiment: 'Neutral',
    confidence: 0,
    emotion: 'Unknown',
    summary: `[Fallback] ${provider} failed: ${safeReason}`,
    status: 'failed',
    errorCode,
    errorMessage: safeReason,
    latencyMs,
    model: model || 'unknown',
  };
}

