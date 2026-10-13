import { Schema, model, Document, Types } from 'mongoose';

export interface IRecommendedAnalysis {
  id: string;
  name: string;
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  why: string;
  applicable: boolean;
  usedColumns?: string[];
  expectedInsight?: string;
}

export interface IAspectSentiment {
  aspect: string;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  count: number;
}

export interface IEmergingIssue {
  title: string;
  description: string;
  aspectOrKeyword: string;
  previousCount: number;
  currentCount: number;
  percentageIncrease: number;
  severity: 'Critical' | 'Warning' | 'Info';
}

export interface IRootCauseItem {
  cause: string;
  percentage: number;
  count: number;
  explanation: string;
  type: 'DATA_OBSERVED' | 'AI_HYPOTHESIS';
}

export interface IDiscoveredProblem {
  id: string;
  title: string;
  category: string;
  occurrences: number;
  negativeMentions: number;
  percentage: number;
  trendPercentage: number;
  affectedProductsOrRegions: string[];
  affectedPeriod: string;
  sampleEvidenceQuotes: string[];
  severityScore: number; // 0 - 100
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  severityFactors: {
    frequency: string;
    negativeSentiment: string;
    growthRate: string;
    affectedUsers: string;
  };
}

export interface IPrioritizedSolution {
  id: string;
  problemId: string;
  problemTitle: string;
  solutionTitle: string;
  actionableSteps: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  reason: string;
  evidence: string;
  currentBaseline: string;
  estimatedTarget: string;
  estimateDisclaimer: string;
}

export interface IActionPlanItem {
  stepNumber: number;
  problemTitle: string;
  action: string;
  evidence: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  expectedImpact: string;
  difficulty: string;
}

export interface IImprovementArea {
  area: string;
  status: 'Critical Improvement Required' | 'Needs Significant Improvement' | 'Needs Improvement' | 'Moderate Improvement' | 'Generally Positive';
  evidenceSummary: string;
}

export interface IExecutiveSummary {
  totalRecordsAnalyzed: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  top3Problems: string[];
  highestPriorityReason: string;
  recommendedImmediateAction: string;
}

export interface IActionableRecommendation {
  id: string;
  problem: string;
  recommendation: string;
  evidence: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface IDisagreementDetail {
  text: string;
  geminiSentiment: string;
  groqSentiment: string;
  huggingfaceSentiment: string;
  finalSentiment: string;
  reason: string;
}

export interface IAnalysisJobPayload {
  recommendations: IRecommendedAnalysis[];
  sentimentSummary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
    averageConfidence: number;
    overallAgreement: number;
  };
  aspects: IAspectSentiment[];
  emergingIssues: IEmergingIssue[];
  discoveredProblems: IDiscoveredProblem[];
  rootCauses: IRootCauseItem[];
  prioritizedSolutions: IPrioritizedSolution[];
  actionPlan: IActionPlanItem[];
  improvementAreas: IImprovementArea[];
  executiveSummary: IExecutiveSummary;
  trendData: { period: string; positive: number; negative: number; neutral: number }[];
  modelDisagreements: IDisagreementDetail[];
  actionableRecommendations: IActionableRecommendation[];
}

export interface IAnalysisJob extends Document {
  userId: Types.ObjectId;
  datasetId: Types.ObjectId;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 - 100
  totalRows: number;
  processedRows: number;
  selectedAnalyses: string[];
  results?: IAnalysisJobPayload;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisJobSchema = new Schema<IAnalysisJob>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    progress: { type: Number, default: 0 },
    totalRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    selectedAnalyses: [{ type: String }],
    results: { type: Schema.Types.Mixed },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

export const AnalysisJob = model<IAnalysisJob>('AnalysisJob', AnalysisJobSchema);
export default AnalysisJob;
