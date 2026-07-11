import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalysis extends Document {
  userId: Types.ObjectId;
  text: string;
  gemini: {
    sentiment: string;
    confidence: number;
    emotion: string;
    summary: string;
  };
  groq: {
    sentiment: string;
    confidence: number;
    emotion: string;
    summary: string;
  };
  huggingface: {
    sentiment: string;
    confidence: number;
    emotion?: string;
    summary?: string;
  };
  finalSentiment: string;
  agreementPercentage: number;
  mostConfidentModel: string;
  createdAt: Date;
}

const ModelResultSchema = new Schema({
  sentiment: { type: String, required: true },
  confidence: { type: Number, required: true },
  emotion: { type: String, default: 'Neutral' },
  summary: { type: String, default: '' }
}, { _id: false });

const AnalysisSchema = new Schema<IAnalysis>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    text: {
      type: String,
      required: [true, 'Text content is required'],
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
    agreementPercentage: {
      type: Number,
      required: true
    },
    mostConfidentModel: {
      type: String,
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Analysis = model<IAnalysis>('Analysis', AnalysisSchema);
export default Analysis;
