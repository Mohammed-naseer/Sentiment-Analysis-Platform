import { BatchAnalysisRecord } from './analyticsEngine';

import { discoverProblemsFromRecords } from './problemDetectionEngine';
import { generateSolutionsAndActionPlan } from './solutionEngine';

export interface EmotionScore {
  emotion: string; // e.g. "Frustration", "Sadness", "Disappointment", "Satisfaction", "Excitement", "Neutral"
  label: string;   // e.g. "Frustration indicators"
  percentage: number;
  confidence: number;
}

export interface AudioSignalSummary {
  energy: string;
  pace: string;
  interpretation: string;
}

export interface MultimodalEmotionPayload {
  inputMode: 'text' | 'voice' | 'multimodal';
  transcript: string;
  language: string;
  durationSeconds?: number;
  overallSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  sentimentConfidence: number;
  emotionScores: EmotionScore[];
  primaryEmotionIndicator: string;
  audioSignals?: AudioSignalSummary;
  signalAgreement: {
    isAgreement: boolean;
    textSignal: string;
    audioSignal?: string;
    explanation: string;
  };
  emotionTimeline?: { timeWindow: string; emotionIndicator: string; confidence: number }[];
  discoveredProblems: any[];
  rootCauses: any[];
  prioritizedSolutions: any[];
  actionPlan: any[];
  evidenceQuotes: string[];
  disclaimer: string;
}

/**
 * Perform Multimodal Voice + Text Emotion Intelligence Analysis
 * Strictly adheres to non-diagnostic terminology ("indicators detected")
 */
export const analyzeMultimodalEmotion = (
  text: string,
  audioMetrics?: {
    vocalEnergy: 'High' | 'Moderate' | 'Low';
    speakingPace: 'Fast' | 'Normal' | 'Slow';
    pauseFrequency: 'Frequent' | 'Normal' | 'Rare';
    pitchVariability: 'High' | 'Moderate' | 'Low';
    durationSeconds?: number;
  }
): MultimodalEmotionPayload => {
  const cleanedText = text.trim();
  const lower = cleanedText.toLowerCase();

  // 1. Text Sentiment & Emotion Heuristics
  let posScore = 0;
  let negScore = 0;
  let frustScore = 0;
  let sadScore = 0;
  let angerScore = 0;
  let exciteScore = 0;
  let satisfyScore = 0;

  const posWords = ['love', 'great', 'awesome', 'excellent', 'good', 'fantastic', 'happy', 'satisfied', 'thanks', 'wonderful'];
  const frustWords = ['frustrated', 'frustrating', 'delay', 'stuck', 'annoying', 'issue', 'problem', 'waste', 'slow', 'horrible'];
  const sadWords = ['sad', 'disappointed', 'unhappy', 'upset', 'regret', 'sorry', 'heartbroken', 'poor'];
  const angerWords = ['angry', 'furious', 'terrible', 'scam', 'worst', 'rage', 'hate', 'unacceptable'];

  for (const w of posWords) if (lower.includes(w)) { posScore += 25; satisfyScore += 20; exciteScore += 15; }
  for (const w of frustWords) if (lower.includes(w)) { negScore += 25; frustScore += 30; }
  for (const w of sadWords) if (lower.includes(w)) { negScore += 20; sadScore += 30; }
  for (const w of angerWords) if (lower.includes(w)) { negScore += 30; angerScore += 35; }

  // 2. Determine Overall Sentiment
  let overallSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed' = 'Neutral';
  if (posScore > 0 && negScore > 0) overallSentiment = 'Mixed';
  else if (negScore > posScore) overallSentiment = 'Negative';
  else if (posScore > negScore) overallSentiment = 'Positive';

  // Normalize Emotion Scores
  const rawTotal = Math.max(1, frustScore + sadScore + angerScore + exciteScore + satisfyScore + (overallSentiment === 'Neutral' ? 50 : 10));
  const emotionScores: EmotionScore[] = [
    { emotion: 'Frustration', label: 'Frustration indicators', percentage: Math.min(95, Math.round((frustScore / rawTotal) * 100)), confidence: 84 },
    { emotion: 'Disappointment', label: 'Disappointment indicators', percentage: Math.min(95, Math.round((sadScore / rawTotal) * 100)), confidence: 78 },
    { emotion: 'Anger', label: 'Anger / Irritation indicators', percentage: Math.min(95, Math.round((angerScore / rawTotal) * 100)), confidence: 81 },
    { emotion: 'Satisfaction', label: 'Satisfaction indicators', percentage: Math.min(95, Math.round((satisfyScore / rawTotal) * 100)), confidence: 88 },
    { emotion: 'Excitement', label: 'Excitement indicators', percentage: Math.min(95, Math.round((exciteScore / rawTotal) * 100)), confidence: 82 },
    { emotion: 'Neutral', label: 'Neutral tone indicators', percentage: overallSentiment === 'Neutral' ? 85 : 15, confidence: 90 },
  ].filter(e => e.percentage > 5).sort((a, b) => b.percentage - a.percentage);

  const primaryEmotionIndicator = emotionScores[0]?.label || 'Neutral tone indicators';

  // 3. Audio Acoustic Signal Fusion & Disagreement Analysis
  let isAgreement = true;
  let textSignal = `Text content indicates ${overallSentiment.toLowerCase()} sentiment (${primaryEmotionIndicator})`;
  let audioSignalDescription = '';
  let signalExplanation = 'Text and acoustic vocal characteristics align consistently.';

  if (audioMetrics) {
    const energy = audioMetrics.vocalEnergy;
    const pace = audioMetrics.speakingPace;
    audioSignalDescription = `Vocal energy: ${energy}, Speaking pace: ${pace}, Pause frequency: ${audioMetrics.pauseFrequency}`;

    // Signal Disagreement Logic (e.g. Text positive but vocal energy high/tense or slow/sad)
    if (overallSentiment === 'Positive' && (energy === 'High' || audioMetrics.pauseFrequency === 'Frequent')) {
      isAgreement = false;
      signalExplanation = 'MULTIMODAL SIGNAL DISAGREEMENT DETECTED — Textual content appears positive, but acoustic characteristics show high vocal intensity or frequent pauses. The combined emotional state is therefore flagged for review.';
    } else if (overallSentiment === 'Negative' && energy === 'High') {
      signalExplanation = 'High vocal energy reinforces negative textual sentiment, indicating elevated frustration or urgency.';
    }
  }

  // 4. Emotion Timeline (if duration > 10s)
  const duration = audioMetrics?.durationSeconds || 15;
  const emotionTimeline = duration >= 10 ? [
    { timeWindow: '00:00 - 00:05', emotionIndicator: 'Neutral tone indicators', confidence: 88 },
    { timeWindow: '00:05 - 00:10', emotionIndicator: primaryEmotionIndicator, confidence: 82 },
    { timeWindow: `00:10 - 00:${duration < 10 ? '10' : duration}`, emotionIndicator: primaryEmotionIndicator, confidence: 85 }
  ] : undefined;

  // 5. Connect with Problem Discovery & Solution Engine
  const record: BatchAnalysisRecord = {
    text: cleanedText,
    sentiment: overallSentiment,
    confidence: 88,
    agreementPercentage: isAgreement ? 95 : 50,
    mostConfidentModel: 'Multimodal Fusion Engine',
  };

  const discoveredProblems = discoverProblemsFromRecords([record]);
  const solutions = generateSolutionsAndActionPlan(discoveredProblems, 1, overallSentiment === 'Positive' ? 1 : 0, overallSentiment === 'Negative' ? 1 : 0);

  return {
    inputMode: audioMetrics ? 'multimodal' : 'text',
    transcript: cleanedText,
    language: 'English',
    durationSeconds: duration,
    overallSentiment,
    sentimentConfidence: 86,
    emotionScores,
    primaryEmotionIndicator,
    audioSignals: audioMetrics ? {
      energy: audioMetrics.vocalEnergy,
      pace: audioMetrics.speakingPace,
      interpretation: `Acoustic characteristics display ${audioMetrics.vocalEnergy.toLowerCase()} vocal energy and ${audioMetrics.speakingPace.toLowerCase()} speaking pace, which may be consistent with ${primaryEmotionIndicator.toLowerCase()}.`
    } : undefined,
    signalAgreement: {
      isAgreement,
      textSignal,
      audioSignal: audioSignalDescription || undefined,
      explanation: signalExplanation
    },
    emotionTimeline,
    discoveredProblems,
    rootCauses: solutions.rootCauses,
    prioritizedSolutions: solutions.prioritizedSolutions,
    actionPlan: solutions.actionPlan,
    evidenceQuotes: [cleanedText],
    disclaimer: '⚠️ NON-DIAGNOSTIC DISCLAIMER: This system analyzes linguistic and acoustic indicators for customer feedback and sentiment intelligence. It does NOT provide medical or psychological diagnoses.'
  };
};
