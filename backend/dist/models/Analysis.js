"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analysis = void 0;
const mongoose_1 = require("mongoose");
const ModelResultSchema = new mongoose_1.Schema({
    sentiment: { type: String, required: true },
    confidence: { type: Number, required: true },
    emotion: { type: String, default: 'Neutral' },
    summary: { type: String, default: '' }
}, { _id: false });
const AnalysisSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
exports.Analysis = (0, mongoose_1.model)('Analysis', AnalysisSchema);
exports.default = exports.Analysis;
