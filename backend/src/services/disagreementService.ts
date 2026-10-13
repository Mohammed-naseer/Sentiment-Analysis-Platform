import { ModelSentimentResult, analyzeWithGemini } from './geminiService';
import logger from '../utils/logger';

export interface ModelConsensusResult {
  finalSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  confidence: number;
  agreementPercentage: number;
  isDisagreement: boolean;
  disagreementReason?: string;
}

export const resolveModelConsensus = async (
  text: string,
  gemini: ModelSentimentResult,
  groq: ModelSentimentResult,
  hf: ModelSentimentResult
): Promise<ModelConsensusResult> => {
  const S_gemini = gemini.sentiment;
  const S_groq = groq.sentiment;
  const S_hf = hf.sentiment;

  if (S_gemini === S_groq && S_groq === S_hf) {
    return {
      finalSentiment: S_gemini as any,
      confidence: Math.round((gemini.confidence + groq.confidence + hf.confidence) / 3),
      agreementPercentage: 100,
      isDisagreement: false,
    };
  }

  if ((S_gemini === S_groq && S_groq !== S_hf) || (S_gemini === S_hf && S_gemini !== S_groq)) {
    return {
      finalSentiment: S_gemini as any,
      confidence: Math.round((gemini.confidence + groq.confidence) / 2),
      agreementPercentage: 66,
      isDisagreement: false,
    };
  }

  if (S_groq === S_hf && S_groq !== S_gemini) {
    return {
      finalSentiment: S_groq as any,
      confidence: Math.round((groq.confidence + hf.confidence) / 2),
      agreementPercentage: 66,
      isDisagreement: false,
    };
  }

  // 33% Agreement - Complete Disagreement between Gemini, Groq, and Hugging Face
  logger.info(`[DisagreementService] Model disagreement detected for text snippet: "${text.slice(0, 40)}..."`);

  // Perform Contextual AI Analysis for Disagreement Resolution
  let finalSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed' = 'Mixed';
  let disagreementReason = 'Models evaluated different linguistic elements: sarcasm, negation, or mixed aspect sentiment.';

  try {
    const prompt = `Perform a contextual tie-breaker analysis on this text where AI models disagreed:
Text: "${text}"
Gemini output: ${S_gemini} (Conf: ${gemini.confidence}%)
Groq output: ${S_groq} (Conf: ${groq.confidence}%)
HuggingFace output: ${S_hf} (Conf: ${hf.confidence}%)

Identify if there is sarcasm, negation, mixed sentiment (e.g. "great camera but awful battery"), or ambiguous context.
Respond with JSON strictly in format:
{
  "finalSentiment": "Positive" | "Negative" | "Neutral" | "Mixed",
  "reason": "Brief explanation of why models disagreed and final ruling"
}`;

    const aiRes = await analyzeWithGemini(prompt);
    if (aiRes && aiRes.summary) {
      try {
        const jsonMatch = aiRes.summary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.finalSentiment) finalSentiment = parsed.finalSentiment;
          if (parsed.reason) disagreementReason = parsed.reason;
        }
      } catch {
        disagreementReason = aiRes.summary;
      }
    }
  } catch (err: any) {
    logger.warn('[DisagreementService] AI tie-breaker error, falling back to confidence weighting:', err.message);
    const maxConf = Math.max(gemini.confidence, groq.confidence, hf.confidence);
    if (maxConf === gemini.confidence) finalSentiment = S_gemini as any;
    else if (maxConf === groq.confidence) finalSentiment = S_groq as any;
    else finalSentiment = S_hf as any;
  }

  return {
    finalSentiment,
    confidence: Math.max(gemini.confidence, groq.confidence, hf.confidence),
    agreementPercentage: 33,
    isDisagreement: true,
    disagreementReason,
  };
};
