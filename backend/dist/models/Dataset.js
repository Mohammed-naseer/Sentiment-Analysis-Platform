"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = void 0;
const mongoose_1 = require("mongoose");
const ColumnProfileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'numeric', 'categorical', 'date', 'unknown'], required: true },
    semanticRole: { type: String, enum: ['feedback_text', 'rating', 'product_category', 'timestamp', 'customer_id', 'location', 'price', 'other'], default: 'other' },
    missingCount: { type: Number, default: 0 },
    uniqueCount: { type: Number, default: 0 },
    sampleValues: [{ type: String }]
}, { _id: false });
const DatasetProfileSchema = new mongoose_1.Schema({
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
const DatasetSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    profile: { type: DatasetProfileSchema, required: true },
    sampleData: [{ type: mongoose_1.Schema.Types.Mixed }]
}, { timestamps: true });
exports.Dataset = (0, mongoose_1.model)('Dataset', DatasetSchema);
exports.default = exports.Dataset;
