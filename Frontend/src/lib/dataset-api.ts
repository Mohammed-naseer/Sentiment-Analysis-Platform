// ─────────────────────────────────────────────────────────────────────────────
// Dataset API helpers — extends the existing api.ts client
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = typeof window !== "undefined"
  ? (import.meta.env?.VITE_API_URL ?? "http://localhost:5001")
  : "http://localhost:5001";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ai_sentiment_token");
}

export interface ColumnProfile {
  name: string;
  type: "text" | "numeric" | "categorical" | "date" | "unknown";
  semanticRole?: "feedback_text" | "rating" | "product_category" | "timestamp" | "customer_id" | "location" | "price" | "other";
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface DatasetProfile {
  totalRows: number;
  totalColumns: number;
  fileSize: number;
  fileType: string;
  missingValuesCount: number;
  missingPercentage: number;
  duplicateRowsCount: number;
  emptyColumnsCount: number;
  qualityScore: number;
  qualityIssues: string[];
  detectedLanguage?: string;
  domainName?: string;
  domainConfidence?: number;
  domainExplanation?: string;
  columns: ColumnProfile[];
  semanticSummary: string;
}

export interface RecommendedAnalysis {
  id: string;
  name: string;
  priority: "High" | "Medium" | "Low";
  description: string;
  why: string;
  applicable: boolean;
  usedColumns?: string[];
  expectedInsight?: string;
}

export interface UploadDatasetResponse {
  success: boolean;
  data: {
    datasetId: string;
    fileName: string;
    profile: DatasetProfile;
    sampleData: Record<string, unknown>[];
    recommendations: RecommendedAnalysis[];
  };
}

export interface JobStatusResponse {
  success: boolean;
  data: {
    jobId: string;
    status: "queued" | "processing" | "completed" | "failed";
    progress: number;
    totalRows: number;
    processedRows: number;
    results?: AnalyticsPayload;
    errorMessage?: string;
  };
}

export interface AspectSentiment {
  aspect: string;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  count: number;
}

export interface EmergingIssue {
  title: string;
  description: string;
  aspectOrKeyword: string;
  previousCount: number;
  currentCount: number;
  percentageIncrease: number;
  severity: "Critical" | "Warning" | "Info";
}

export interface RootCauseItem {
  cause: string;
  percentage: number;
  count: number;
  explanation: string;
  type?: "DATA_OBSERVED" | "AI_HYPOTHESIS";
}

export interface DiscoveredProblem {
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
  severityScore: number;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severityFactors: {
    frequency: string;
    negativeSentiment: string;
    growthRate: string;
    affectedUsers: string;
  };
}

export interface PrioritizedSolution {
  id: string;
  problemId: string;
  problemTitle: string;
  solutionTitle: string;
  actionableSteps: string[];
  priority: "HIGH" | "MEDIUM" | "LOW";
  expectedImpact: "HIGH" | "MEDIUM" | "LOW";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  reason: string;
  evidence: string;
  currentBaseline: string;
  estimatedTarget: string;
  estimateDisclaimer: string;
}

export interface ActionPlanItem {
  stepNumber: number;
  problemTitle: string;
  action: string;
  evidence: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  expectedImpact: string;
  difficulty: string;
}

export interface ImprovementArea {
  area: string;
  status: "Critical Improvement Required" | "Needs Significant Improvement" | "Needs Improvement" | "Moderate Improvement" | "Generally Positive";
  evidenceSummary: string;
}

export interface ExecutiveSummary {
  totalRecordsAnalyzed: number;
  positivePercentage: number;
  negativePercentage: number;
  neutralPercentage: number;
  top3Problems: string[];
  highestPriorityReason: string;
  recommendedImmediateAction: string;
}

export interface ActionableRecommendation {
  id: string;
  problem: string;
  recommendation: string;
  evidence: string;
  priority: "High" | "Medium" | "Low";
}

export interface DisagreementDetail {
  text: string;
  geminiSentiment: string;
  groqSentiment: string;
  huggingfaceSentiment: string;
  finalSentiment: string;
  reason: string;
}

export interface AnalyticsPayload {
  recommendations: RecommendedAnalysis[];
  sentimentSummary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
    averageConfidence: number;
    overallAgreement: number;
  };
  aspects: AspectSentiment[];
  emergingIssues: EmergingIssue[];
  discoveredProblems?: DiscoveredProblem[];
  rootCauses: RootCauseItem[];
  prioritizedSolutions?: PrioritizedSolution[];
  actionPlan?: ActionPlanItem[];
  improvementAreas?: ImprovementArea[];
  executiveSummary?: ExecutiveSummary;
  trendData: { period: string; positive: number; negative: number; neutral: number }[];
  modelDisagreements: DisagreementDetail[];
  actionableRecommendations: ActionableRecommendation[];
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => ({ success: false, message: "Invalid server response" }));
  if (!res.ok) {
    throw new Error(json?.message ?? `HTTP ${res.status}`);
  }
  return json as T;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({ success: false, message: "Invalid server response" }));
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export interface JobSummary {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  totalRows: number;
  processedRows: number;
  createdAt: string;
  fileName: string;
  fileType: string;
  errorMessage?: string;
  executiveSummary?: ExecutiveSummary | null;
  discoveredProblemsCount: number;
  prioritizedSolutionsCount: number;
}

export const datasetApi = {
  uploadDataset: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return uploadFile<UploadDatasetResponse>("/api/datasets/upload", fd);
  },
  startAnalysis: (datasetId: string, selectedAnalyses: string[]) =>
    request<{ success: boolean; data: { jobId: string; status: string } }>(
      "POST",
      `/api/datasets/${datasetId}/analyze`,
      { selectedAnalyses }
    ),
  pollJob: (jobId: string) =>
    request<JobStatusResponse>("GET", `/api/datasets/jobs/${jobId}`),

  listJobs: () =>
    request<{ success: boolean; data: JobSummary[] }>("GET", "/api/datasets/jobs"),

  getJobResults: (jobId: string) =>
    request<JobStatusResponse>("GET", `/api/datasets/jobs/${jobId}`),
};

