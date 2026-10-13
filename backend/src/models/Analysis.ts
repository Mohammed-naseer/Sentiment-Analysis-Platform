import { Schema, model, Document, Types } from 'mongoose';

export interface IAspectResult {
  aspect: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  evidence: string;
}

export interface IProviderResult {
  sentiment: string;
  confidence: number;
  emotion: string;
  emotionConfidence?: number;
  summary: string;
  status: 'success' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  model?: string;
  aspects?: IAspectResult[];
}

export interface IVisualDefectItem {
  label: string;
  confidence: number;
}

export interface IAnalysis extends Document {
  analysisId: string;
  userId: Types.ObjectId;
  text: string;
  inputHash: string;
  product?: string;
  category?: string;
  analysisType?: 'Single' | 'Batch' | 'Multimodal';
  modelVersion?: string;
  gemini: IProviderResult;
  groq: IProviderResult;
  huggingface: IProviderResult;
  finalSentiment: string;
  sentimentConfidence: number;
  agreementPercentage: number;
  mostConfidentModel: string;
  activeProvidersCount: number;
  totalProvidersCount: number;
  aspectResults: IAspectResult[];
  visualAnalysis?: {
    imageId: string;
    imageUrl: string;
    imageHash: string;
    label: string;
    confidence: number;
    multipleDefects?: IVisualDefectItem[];
    imageQuality: {
      usable: boolean;
      score: number;
      reason?: string;
    };
    modelName: string;
    modelVersion: string;
    userFeedback?: {
      isCorrect: boolean;
      correctedLabel?: string;
      timestamp: Date;
    };
    analyzedAt: Date;
  };
  multimodalAnalysis?: {
    textSentiment: string;
    visualIssue: string;
    consistency: 'CONSISTENT' | 'POTENTIALLY_INCONSISTENT' | 'INSUFFICIENT_EVIDENCE';
    confidence: number;
    explanation: string;
  };
  createdAt: Date;
}

const AspectResultSchema = new Schema({
  aspect: { type: String, required: true },
  sentiment: { type: String, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'], required: true },
  confidence: { type: Number, required: true },
  evidence: { type: String, default: '' }
}, { _id: false });

const ModelResultSchema = new Schema({
  sentiment: { type: String, required: true },
  confidence: { type: Number, required: true },
  emotion: { type: String, default: 'Neutral' },
  emotionConfidence: { type: Number, default: 80 },
  summary: { type: String, default: '' },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  errorCode: { type: String },
  errorMessage: { type: String },
  latencyMs: { type: Number },
  model: { type: String },
  aspects: [AspectResultSchema],
}, { _id: false });

const AnalysisSchema = new Schema<IAnalysis>(
  {
    analysisId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Text content is required'],
    },
    inputHash: {
      type: String,
      required: true,
      index: true,
    },
    product: {
      type: String,
      default: 'General',
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    analysisType: {
      type: String,
      enum: ['Single', 'Batch', 'Multimodal'],
      default: 'Single',
    },
    modelVersion: {
      type: String,
      default: 'ensemble-v2.0',
    },
    gemini: {
      type: ModelResultSchema,
      required: true
    },
    groq: {
      type: ModelResultSchema,
      required: true
    },
    huggingface: {
      type: ModelResultSchema,
      required: true
    },
    finalSentiment: {
      type: String,
      required: true,
      index: true
    },
    sentimentConfidence: {
      type: Number,
      required: true,
      default: 80
    },
    agreementPercentage: {
      type: Number,
      required: true
    },
    mostConfidentModel: {
      type: String,
      required: true
    },
    activeProvidersCount: {
      type: Number,
      default: 3
    },
    totalProvidersCount: {
      type: Number,
      default: 3
    },
    aspectResults: {
      type: [AspectResultSchema],
      default: []
    },
    visualAnalysis: {
      type: {
        imageId: { type: String, required: true },
        imageUrl: { type: String, required: true },
        imageHash: { type: String, default: '' },
        label: { type: String, required: true },
        confidence: { type: Number, required: true },
        multipleDefects: [{
          label: { type: String },
          confidence: { type: Number }
        }],
        imageQuality: {
          usable: { type: Boolean, default: true },
          score: { type: Number, default: 1.0 },
          reason: { type: String, default: '' }
        },
        modelName: { type: String, default: 'MobileNetV3-DefectClassifier' },
        modelVersion: { type: String, default: '1.1' },
        userFeedback: {
          isCorrect: { type: Boolean },
          correctedLabel: { type: String },
          timestamp: { type: Date }
        },
        analyzedAt: { type: Date, default: Date.now }
      },
      required: false,
      _id: false
    },
    multimodalAnalysis: {
      type: {
        textSentiment: { type: String, required: true },
        visualIssue: { type: String, required: true },
        consistency: {
          type: String,
          enum: ['CONSISTENT', 'POTENTIALLY_INCONSISTENT', 'INSUFFICIENT_EVIDENCE'],
          required: true
        },
        confidence: { type: Number, required: true },
        explanation: { type: String, default: '' }
      },
      required: false,
      _id: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Analysis = model<IAnalysis>('Analysis', AnalysisSchema);
export default Analysis;

