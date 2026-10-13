"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisJob = void 0;
const mongoose_1 = require("mongoose");
const AnalysisJobSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    datasetId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Dataset', required: true, index: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    progress: { type: Number, default: 0 },
    totalRows: { type: Number, default: 0 },
    processedRows: { type: Number, default: 0 },
    selectedAnalyses: [{ type: String }],
    results: { type: mongoose_1.Schema.Types.Mixed },
    errorMessage: { type: String }
}, { timestamps: true });
exports.AnalysisJob = (0, mongoose_1.model)('AnalysisJob', AnalysisJobSchema);
exports.default = exports.AnalysisJob;
