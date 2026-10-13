import axios from 'axios';
import { config } from '../config/env';
import logger from '../utils/logger';

export interface PythonMlPrediction {
  sentiment: string;
  confidence: number;
  models: {
    cnn: string;
    lstm: string;
    roberta: string;
  };
  agreement_percentage?: number;
  disagreement_reason?: string;
}

export interface PythonMlAnalysis {
  text: string;
  cleaned_text: string;
  sentiment: string;
  confidence: number;
  models: {
    cnn: { label: string; confidence: number; probabilities: Record<string, number> };
    lstm: { label: string; confidence: number; probabilities: Record<string, number> };
    roberta: { label: string; confidence: number; probabilities: Record<string, number> };
  };
  agreement: {
    percentage: number;
    is_unanimous: boolean;
    disagreement_reason: string;
  };
  emotion_analysis?: {
    status: string;
    message?: string;
    primary_emotion?: string;
    confidence?: number;
  };
}

/**
 * Check health status of Python Deep Learning Microservice
 */
export const checkPythonMlHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${config.pythonMlServiceUrl}/health`, { timeout: 3000 });
    return response.status === 200 && response.data?.status === 'healthy';
  } catch (error: any) {
    logger.warn(`[PythonMlService] Health check failed at ${config.pythonMlServiceUrl}: ${error.message}`);
    return false;
  }
};

/**
 * Predict sentiment using Python CNN/LSTM/RoBERTa ensemble
 */
export const predictWithPythonMl = async (text: string, model: string = 'ensemble'): Promise<PythonMlPrediction> => {
  try {
    const response = await axios.post(`${config.pythonMlServiceUrl}/predict`, { text, model }, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    logger.error(`[PythonMlService] Predict error: ${error.message}`);
    throw error;
  }
};

/**
 * Full deep analysis with model agreements & emotion detection
 */
export const analyzeWithPythonMl = async (text: string): Promise<PythonMlAnalysis> => {
  try {
    const response = await axios.post(`${config.pythonMlServiceUrl}/analyze`, { text }, { timeout: 15000 });
    return response.data;
  } catch (error: any) {
    logger.error(`[PythonMlService] Full analysis error: ${error.message}`);
    throw error;
  }
};
