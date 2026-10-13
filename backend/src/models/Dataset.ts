import { Schema, model, Document, Types } from 'mongoose';

export interface IColumnProfile {
  name: string;
  type: 'text' | 'numeric' | 'categorical' | 'date' | 'unknown';
  semanticRole?: 'feedback_text' | 'rating' | 'product_category' | 'timestamp' | 'customer_id' | 'location' | 'price' | 'other';
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface IDatasetProfile {
  totalRows: number;
  totalColumns: number;
  fileSize: number; // in bytes
  fileType: string;
  missingValuesCount: number;
  missingPercentage: number;
  duplicateRowsCount: number;
  emptyColumnsCount: number;
  qualityScore: number; // 0 - 100
  qualityIssues: string[];
  detectedLanguage?: string;
  domainName?: string; // e.g. Product Reviews, Customer Support, Restaurant Reviews, App Reviews
  domainConfidence?: number; // 0 - 100
  domainExplanation?: string;
  columns: IColumnProfile[];
  semanticSummary: string;
}

export interface IDataset extends Document {
  userId: Types.ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  profile: IDatasetProfile;
  sampleData: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}

const ColumnProfileSchema = new Schema<IColumnProfile>({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'numeric', 'categorical', 'date', 'unknown'], required: true },
  semanticRole: { type: String, enum: ['feedback_text', 'rating', 'product_category', 'timestamp', 'customer_id', 'location', 'price', 'other'], default: 'other' },
  missingCount: { type: Number, default: 0 },
  uniqueCount: { type: Number, default: 0 },
  sampleValues: [{ type: String }]
}, { _id: false });

const DatasetProfileSchema = new Schema<IDatasetProfile>({
  totalRows: { type: Number, required: true },
  totalColumns: { type: Number, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  missingValuesCount: { type: Number, default: 0 },
  missingPercentage: { type: Number, default: 0 },
  duplicateRowsCount: { type: Number, default: 0 },
  emptyColumnsCount: { type: Number, default: 0 },
  qualityScore: { type: Number, default: 100 },
  qualityIssues: [{ type: String }],
  detectedLanguage: { type: String, default: 'English' },
  domainName: { type: String, default: 'General Dataset' },
  domainConfidence: { type: Number, default: 85 },
  domainExplanation: { type: String, default: 'Inferred from dataset columns and sample values.' },
  columns: [ColumnProfileSchema],
  semanticSummary: { type: String, default: '' }
}, { _id: false });

const DatasetSchema = new Schema<IDataset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    profile: { type: DatasetProfileSchema, required: true },
    sampleData: [{ type: Schema.Types.Mixed }]
  },
  { timestamps: true }
);

export const Dataset = model<IDataset>('Dataset', DatasetSchema);
export default Dataset;
