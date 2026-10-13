"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVisionStats = exports.recordVisionFeedback = exports.analyzeMultimodalCombined = exports.analyzeImageOnly = exports.visionUploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const Analysis_1 = require("../models/Analysis");
const visionService_1 = require("../services/visionService");
const multimodalConsistencyEngine_1 = require("../services/multimodalConsistencyEngine");
const analysisService_1 = require("../services/analysisService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
// Setup local image uploads directory
const UPLOADS_DIR = path_1.default.join(__dirname, '../../uploads/images');
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Multer storage configuration
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB limit
    },
    fileFilter: (_req, file, cb) => {
        const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowedMime.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new Error(`Unsupported image type '${file.mimetype}'. Allowed: JPEG, PNG, WEBP.`));
        }
    },
});
exports.visionUploadMiddleware = upload.single('image');
/**
 * POST /api/vision/analyze
 * Analyzes image for defect classification, image quality, and hashes
 */
const analyzeImageOnly = async (req, res) => {
    if (!req.file) {
        (0, response_1.sendError)(res, 'No image file uploaded. Please provide a valid JPEG, PNG, or WEBP image.', null, 400);
        return;
    }
    try {
        const { productCategory } = req.body;
        const visionResult = await (0, visionService_1.analyzeImageWithVisionService)(req.file.buffer, req.file.originalname, req.file.mimetype, productCategory);
        (0, response_1.sendSuccess)(res, 'Image visual analysis complete.', visionResult);
    }
    catch (error) {
        logger_1.default.error('[VisionController] Image analysis error:', error.message);
        (0, response_1.sendError)(res, 'Failed to process visual image analysis.', error.message, 500);
    }
};
exports.analyzeImageOnly = analyzeImageOnly;
/**
 * POST /api/vision/multimodal
 * Analyzes customer text sentiment AND attached product image, running
 * cross-modal consistency correlation and persisting to MongoDB Analysis.
 */
const analyzeMultimodalCombined = async (req, res) => {
    const user = req.user;
    const text = (req.body.text || '').trim();
    const productCategory = req.body.productCategory || req.body.category || 'General';
    if (!user || !user._id) {
        (0, response_1.sendError)(res, 'Unauthorized access.', 'AuthError', 401);
        return;
    }
    if (!text) {
        (0, response_1.sendError)(res, 'Text feedback is required for multimodal review analysis.', null, 400);
        return;
    }
    try {
        // 1. Text Sentiment Analysis via Multi-Model Consensus (Gemini, Groq, HuggingFace)
        const savedRecord = await (0, analysisService_1.runMultiModelAnalysis)(user._id, text);
        let visualAnalysisData = undefined;
        let multimodalCorrelation = undefined;
        // 2. If Image is Attached, Process Visual Pipeline
        if (req.file) {
            const imageId = crypto_1.default.randomUUID();
            const ext = path_1.default.extname(req.file.originalname) || '.jpg';
            const diskFilename = `${imageId}${ext}`;
            const diskPath = path_1.default.join(UPLOADS_DIR, diskFilename);
            // Save file locally for retrieval / preview
            fs_1.default.writeFileSync(diskPath, req.file.buffer);
            const visionResult = await (0, visionService_1.analyzeImageWithVisionService)(req.file.buffer, req.file.originalname, req.file.mimetype, productCategory);
            visualAnalysisData = {
                imageId,
                imageUrl: `/uploads/images/${diskFilename}`,
                imageHash: visionResult.hashes?.sha256 || '',
                label: visionResult.label,
                confidence: visionResult.confidence,
                multipleDefects: visionResult.multipleDefects || [
                    { label: visionResult.label, confidence: visionResult.confidence }
                ],
                imageQuality: visionResult.imageQuality,
                modelName: visionResult.model.name,
                modelVersion: visionResult.model.version,
                analyzedAt: new Date(),
            };
            // Correlate Text & Vision
            multimodalCorrelation = (0, multimodalConsistencyEngine_1.correlateTextAndVision)(text, savedRecord.finalSentiment, visionResult.label, visionResult.confidence, visionResult.imageQuality.usable, visionResult.imageQuality.reason, visionResult.multipleDefects);
            // Update the saved record with visual intelligence data
            savedRecord.visualAnalysis = visualAnalysisData;
            savedRecord.multimodalAnalysis = multimodalCorrelation;
            await savedRecord.save();
        }
        (0, response_1.sendSuccess)(res, 'Multimodal intelligence analysis completed.', {
            analysisId: savedRecord._id,
            text: {
                id: savedRecord._id,
                text: savedRecord.text,
                models: {
                    gemini: savedRecord.gemini,
                    groq: savedRecord.groq,
                    huggingface: savedRecord.huggingface,
                },
                finalResult: {
                    sentiment: savedRecord.finalSentiment,
                    agreementPercentage: savedRecord.agreementPercentage,
                    mostConfidentModel: savedRecord.mostConfidentModel,
                },
            },
            visual: visualAnalysisData,
            multimodal: multimodalCorrelation,
        });
    }
    catch (error) {
        logger_1.default.error('[VisionController] Multimodal analysis error:', error.message);
        (0, response_1.sendError)(res, 'Failed to process multimodal analysis.', error.message, 500);
    }
};
exports.analyzeMultimodalCombined = analyzeMultimodalCombined;
/**
 * POST /api/vision/feedback
 * Records human-in-the-loop validation (isCorrect, correctedLabel)
 */
const recordVisionFeedback = async (req, res) => {
    const { analysisId, isCorrect, correctedLabel } = req.body;
    if (!analysisId) {
        (0, response_1.sendError)(res, 'analysisId is required to submit feedback.', null, 400);
        return;
    }
    try {
        const analysis = await Analysis_1.Analysis.findById(analysisId);
        if (!analysis) {
            (0, response_1.sendError)(res, 'Analysis record not found.', null, 404);
            return;
        }
        if (!analysis.visualAnalysis) {
            (0, response_1.sendError)(res, 'This analysis does not contain a visual intelligence component.', null, 400);
            return;
        }
        analysis.visualAnalysis.userFeedback = {
            isCorrect: Boolean(isCorrect),
            correctedLabel: correctedLabel || undefined,
            timestamp: new Date(),
        };
        await analysis.save();
        (0, response_1.sendSuccess)(res, 'Visual intelligence feedback recorded successfully.', {
            feedback: analysis.visualAnalysis.userFeedback,
        });
    }
    catch (error) {
        logger_1.default.error('[VisionController] Feedback error:', error.message);
        (0, response_1.sendError)(res, 'Failed to submit visual feedback.', error.message, 500);
    }
};
exports.recordVisionFeedback = recordVisionFeedback;
/**
 * GET /api/vision/stats
 * Aggregates visual defect distribution and duplicate rates
 */
const getVisionStats = async (_req, res) => {
    try {
        const records = await Analysis_1.Analysis.find({ 'visualAnalysis': { $exists: true, $ne: null } });
        const totalVisualAnalyses = records.length;
        const defectDistribution = {
            NORMAL: 0,
            PHYSICAL_DAMAGE: 0,
            SCRATCH: 0,
            CRACK: 0,
            BROKEN_COMPONENT: 0,
            PACKAGING_DAMAGE: 0,
            OTHER_ISSUE: 0,
            UNKNOWN: 0,
        };
        const seenHashes = new Set();
        let duplicateImageCount = 0;
        records.forEach(r => {
            const v = r.visualAnalysis;
            if (v) {
                if (defectDistribution[v.label] !== undefined) {
                    defectDistribution[v.label]++;
                }
                else {
                    defectDistribution['OTHER_ISSUE']++;
                }
                if (v.imageHash) {
                    if (seenHashes.has(v.imageHash)) {
                        duplicateImageCount++;
                    }
                    else {
                        seenHashes.add(v.imageHash);
                    }
                }
            }
        });
        const breakdown = Object.entries(defectDistribution).map(([label, count]) => ({
            label: label.replace(/_/g, ' '),
            count,
            percentage: totalVisualAnalyses > 0 ? Math.round((count / totalVisualAnalyses) * 100) : 0,
        }));
        (0, response_1.sendSuccess)(res, 'Vision statistics retrieved successfully.', {
            totalVisualAnalyses,
            duplicateImageCount,
            uniqueImageCount: seenHashes.size,
            breakdown,
        });
    }
    catch (error) {
        logger_1.default.error('[VisionController] Stats error:', error.message);
        (0, response_1.sendError)(res, 'Failed to compile vision statistics.', error.message, 500);
    }
};
exports.getVisionStats = getVisionStats;
