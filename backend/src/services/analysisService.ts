import mongoose from 'mongoose';
import { Analysis, IAnalysis } from '../models/Analysis';
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
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    agreementPercentage: number;
    mostConfidentModel: 'Gemini' | 'Groq' | 'HuggingFace';
  };
}

/**
 * Runs sentiment analysis on all three AI models in parallel, 
 * compares the results, calculates agreement metrics, and saves the record in MongoDB.
 */
export const runMultiModelAnalysis = async (
  userId: string,
  text: string
): Promise<IAnalysis> => {
  logger.info(`[AnalysisService] Starting parallel multi-model sentiment analysis for user: ${userId}`);

  // 1. Run all three analysis tasks in parallel using Promise.all
  const [geminiResult, groqResult, hfResult] = await Promise.all([
    analyzeWithGemini(text),
    analyzeWithGroq(text),
    analyzeWithHuggingFace(text),
  ]);

  logger.debug('[AnalysisService] AI responses received:', {
    gemini: geminiResult.sentiment,
    groq: groqResult.sentiment,
    huggingface: hfResult.sentiment,
  });

  // 2. Perform comparison and agreement logic
  const S_gemini = geminiResult.sentiment;
  const S_groq = groqResult.sentiment;
  const S_hf = hfResult.sentiment;

  let finalSentiment: 'Positive' | 'Negative' | 'Neutral';
  let agreementPercentage: number;

  if (S_gemini === S_groq && S_groq === S_hf) {
    // 100% agreement - all three models returned the same sentiment
    finalSentiment = S_gemini;
    agreementPercentage = 100;
  } else if (S_gemini === S_groq || S_gemini === S_hf) {
    // 66% agreement - Gemini agrees with Groq or Hugging Face
    finalSentiment = S_gemini;
    agreementPercentage = 66;
  } else if (S_groq === S_hf) {
    // 66% agreement - Groq agrees with Hugging Face
    finalSentiment = S_groq;
    agreementPercentage = 66;
  } else {
    // 33% agreement - all three models disagreed (Positive, Negative, Neutral)
    // Tie-breaker: Select the sentiment of the model that had the highest confidence
    agreementPercentage = 33;
    const maxConfidence = Math.max(geminiResult.confidence, groqResult.confidence, hfResult.confidence);
    
    if (maxConfidence === geminiResult.confidence) {
      finalSentiment = S_gemini;
    } else if (maxConfidence === groqResult.confidence) {
      finalSentiment = S_groq;
    } else {
      finalSentiment = S_hf;
    }
  }

  // 3. Determine the Most Confident Model
  let mostConfidentModel: 'Gemini' | 'Groq' | 'HuggingFace' = 'Gemini';
  const maxConf = Math.max(geminiResult.confidence, groqResult.confidence, hfResult.confidence);
  
  if (maxConf === geminiResult.confidence) {
    mostConfidentModel = 'Gemini';
  } else if (maxConf === groqResult.confidence) {
    mostConfidentModel = 'Groq';
  } else {
    mostConfidentModel = 'HuggingFace';
  }

  // 4. Save analysis details to MongoDB Atlas Database
  const analysisDoc = new Analysis({
    userId: new mongoose.Types.ObjectId(userId),
    text,
    gemini: geminiResult,
    groq: groqResult,
    huggingface: hfResult,
    finalSentiment,
    agreementPercentage,
    mostConfidentModel,
  });

  await analysisDoc.save();
  logger.info(`[AnalysisService] Multi-model analysis saved. ID: ${analysisDoc._id}`);

  return analysisDoc;
};
