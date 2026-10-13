import crypto from 'crypto';
import mongoose from 'mongoose';
import { Analysis, IAnalysis, IAspectResult } from '../models/Analysis';
import { analyzeWithGemini, ModelSentimentResult } from './geminiService';
import { analyzeWithGroq } from './groqService';
import { analyzeWithHuggingFace } from './huggingfaceService';
import logger from '../utils/logger';

export interface AnalysisComparisonResult {
  text: string;
  models: {
    gemini: ModelSentimentResult;
    groq: ModelSentimentResult;
    huggingface: ModelSentimentResult;
  };
  finalResult: {
    sentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
    confidence: number;
    agreementPercentage: number;
    mostConfidentModel: 'Gemini' | 'Groq' | 'HuggingFace';
    activeProvidersCount: number;
    totalProvidersCount: number;
  };
  aspects: IAspectResult[];
}

// ── Provider failure error ─────────────────────────────────────────────────────
export class AIServicesUnavailableError extends Error {
  public workingProviders: number;
  public totalProviders: number;
  constructor(working: number, total: number) {
    super('AI_SERVICES_UNAVAILABLE');
    this.name = 'AIServicesUnavailableError';
    this.workingProviders = working;
    this.totalProviders = total;
  }
}

interface TaggedResult extends ModelSentimentResult {
  _failed?: boolean;
}

async function runProvider<T extends ModelSentimentResult>(
  name: string,
  fn: () => Promise<T>
): Promise<T & { _failed: boolean }> {
  try {
    const result = await fn();
    if (result.status === 'failed' || (result.summary && result.summary.startsWith('[Fallback]'))) {
      logger.warn(`[AnalysisService] ${name} returned a failure marker — excluding from consensus.`);
      return { ...result, _failed: true };
    }
    return { ...result, _failed: false };
  } catch (err: any) {
    logger.error(`[AnalysisService] ${name} threw an unexpected error:`, err.message);
    return {
      sentiment: 'Neutral',
      confidence: 0,
      emotion: 'Unknown',
      summary: `[Fallback] ${name} failed: ${err.message}`,
      status: 'failed',
      errorCode: 'UNEXPECTED_ERROR',
      errorMessage: err.message,
      _failed: true,
    } as T & { _failed: boolean };
  }
}

/**
 * Runs sentiment analysis on all three AI models in parallel,
 * verifies input consistency with SHA-256, compares results,
 * calculates confidence-weighted consensus (including MIXED sentiment),
 * aggregates aspect-based sentiment, and persists to MongoDB.
 */
export const runMultiModelAnalysis = async (
  userId: string,
  text: string,
  options?: {
    product?: string;
    category?: string;
    analysisType?: 'Single' | 'Batch' | 'Multimodal';
    modelVersion?: string;
  }
): Promise<IAnalysis> => {
  const analysisId = `ans_${crypto.randomUUID()}`;
  const inputHash = crypto.createHash('sha256').update(text.trim()).digest('hex');

  logger.info('[AnalysisService] Starting multi-model sentiment analysis:', {
    analysisId,
    inputHash,
    userId,
    textLength: text.length,
    timestamp: new Date().toISOString(),
  });

  // 1. Run all three models in parallel with identical input
  const [geminiResult, groqResult, hfResult] = await Promise.all([
    runProvider('Gemini',      () => analyzeWithGemini(text, analysisId)),
    runProvider('Groq',        () => analyzeWithGroq(text, analysisId)),
    runProvider('HuggingFace', () => analyzeWithHuggingFace(text, analysisId)),
  ]);

  // 2. Filter out failed providers completely
  const workingResults: Array<{ name: 'Gemini' | 'Groq' | 'HuggingFace'; result: TaggedResult }> = [];
  if (!geminiResult._failed) workingResults.push({ name: 'Gemini',      result: geminiResult });
  if (!groqResult._failed)   workingResults.push({ name: 'Groq',        result: groqResult });
  if (!hfResult._failed)     workingResults.push({ name: 'HuggingFace', result: hfResult });

  const workingCount = workingResults.length;
  logger.info(`[AnalysisService] Working providers: ${workingCount}/3`);

  // If ALL providers failed — return HTTP 503, do not save fake records
  if (workingCount === 0) {
    throw new AIServicesUnavailableError(0, 3);
  }

  // 3. Confidence-Aware Consensus Calculation
  let finalSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  let sentimentConfidence: number;
  let agreementPercentage: number;

  const positiveScore = workingResults
    .filter(w => w.result.sentiment === 'Positive')
    .reduce((sum, w) => sum + (w.result.confidence / 100), 0);
  const negativeScore = workingResults
    .filter(w => w.result.sentiment === 'Negative')
    .reduce((sum, w) => sum + (w.result.confidence / 100), 0);
  const neutralScore = workingResults
    .filter(w => w.result.sentiment === 'Neutral')
    .reduce((sum, w) => sum + (w.result.confidence / 100), 0);
  const mixedScore = workingResults
    .filter(w => w.result.sentiment === 'Mixed')
    .reduce((sum, w) => sum + (w.result.confidence / 100), 0);

  // Check if substantial positive AND negative aspects coexist across models
  const hasStrongPolarDispute = (positiveScore >= 0.7 && negativeScore >= 0.6) || mixedScore >= 0.8;

  if (hasStrongPolarDispute) {
    finalSentiment = 'Mixed';
    sentimentConfidence = Math.round(Math.min(100, (positiveScore + negativeScore) / workingCount * 100));
    agreementPercentage = Math.round(100 / workingCount);
  } else {
    // Standard confidence-weighted majority
    const scores = {
      Positive: positiveScore,
      Negative: negativeScore,
      Neutral: neutralScore,
      Mixed: mixedScore,
    };

    const sortedSentiments = (Object.keys(scores) as Array<'Positive' | 'Negative' | 'Neutral' | 'Mixed'>)
      .sort((a, b) => scores[b] - scores[a]);

    finalSentiment = sortedSentiments[0];

    // Agreement percentage = proportion of working models agreeing with final sentiment
    const agreeingModelsCount = workingResults.filter(w => w.result.sentiment === finalSentiment).length;
    agreementPercentage = Math.round((agreeingModelsCount / workingCount) * 100);

    // Calculate final weighted confidence
    const agreeingResults = workingResults.filter(w => w.result.sentiment === finalSentiment);
    if (agreeingResults.length > 0) {
      sentimentConfidence = Math.round(
        agreeingResults.reduce((sum, r) => sum + r.result.confidence, 0) / agreeingResults.length
      );
    } else {
      sentimentConfidence = 70;
    }
  }

  // 4. Most confident working model
  const mostConfidentEntry = workingResults.reduce((best, w) =>
    w.result.confidence > best.result.confidence ? w : best
  );
  const mostConfidentModel = mostConfidentEntry.name;

  // 5. Consolidate Granular Aspects from LLM Providers
  const aspectMap = new Map<string, IAspectResult>();
  for (const w of workingResults) {
    if (w.result.aspects && Array.isArray(w.result.aspects)) {
      for (const asp of w.result.aspects) {
        const key = asp.aspect.toLowerCase().trim();
        if (!aspectMap.has(key) || asp.confidence > aspectMap.get(key)!.confidence) {
          aspectMap.set(key, {
            aspect: asp.aspect,
            sentiment: asp.sentiment,
            confidence: asp.confidence,
            evidence: asp.evidence,
          });
        }
      }
    }
  }
  const aspectResults: IAspectResult[] = Array.from(aspectMap.values());

  logger.debug('[AnalysisService] Consensus Summary:', {
    analysisId,
    workingProviders: `${workingCount}/3`,
    finalSentiment,
    sentimentConfidence,
    agreementPercentage,
    mostConfidentModel,
    aspectsCount: aspectResults.length,
  });

  // 6. Persist to MongoDB
  const analysisDoc = new Analysis({
    analysisId,
    userId: new mongoose.Types.ObjectId(userId),
    text,
    inputHash,
    product: options?.product || 'General',
    category: options?.category || 'General',
    analysisType: options?.analysisType || 'Single',
    modelVersion: options?.modelVersion || 'ensemble-v2.0',
    gemini: geminiResult._failed
      ? {
          sentiment: 'Neutral',
          confidence: 0,
          emotion: 'Unknown',
          summary: geminiResult.errorMessage || '[Provider Failed]',
          status: 'failed',
          errorCode: geminiResult.errorCode || 'FAILED',
          errorMessage: geminiResult.errorMessage || 'Provider failed to respond',
          model: geminiResult.model || 'gemini-flash-latest',
        }
      : geminiResult,
    groq: groqResult._failed
      ? {
          sentiment: 'Neutral',
          confidence: 0,
          emotion: 'Unknown',
          summary: groqResult.errorMessage || '[Provider Failed]',
          status: 'failed',
          errorCode: groqResult.errorCode || 'FAILED',
          errorMessage: groqResult.errorMessage || 'Provider failed to respond',
          model: groqResult.model || 'openai/gpt-oss-20b',
        }
      : groqResult,
    huggingface: hfResult._failed
      ? {
          sentiment: 'Neutral',
          confidence: 0,
          emotion: 'Unknown',
          summary: hfResult.errorMessage || '[Provider Failed]',
          status: 'failed',
          errorCode: hfResult.errorCode || 'FAILED',
          errorMessage: hfResult.errorMessage || 'Provider failed to respond',
          model: hfResult.model || 'roberta',
        }
      : hfResult,
    finalSentiment,
    sentimentConfidence,
    agreementPercentage,
    mostConfidentModel,
    activeProvidersCount: workingCount,
    totalProvidersCount: 3,
    aspectResults,
  });

  await analysisDoc.save();
  logger.info(`[AnalysisService] Saved analysis ${analysisDoc._id} (ID: ${analysisId}) | Active: ${workingCount}/3 | Final: ${finalSentiment} (${sentimentConfidence}%)`);

  return analysisDoc;
};

