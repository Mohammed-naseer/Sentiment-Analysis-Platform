import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Analysis } from '../models/Analysis';
import { analyzeImageWithVisionService } from '../services/visionService';
import { correlateTextAndVision } from '../services/multimodalConsistencyEngine';
import { runMultiModelAnalysis } from '../services/analysisService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

// Setup local image uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image type '${file.mimetype}'. Allowed: JPEG, PNG, WEBP.`));
    }
  },
});

export const visionUploadMiddleware = upload.single('image');

/**
 * POST /api/vision/analyze
 * Analyzes image for defect classification, image quality, and hashes
 */
export const analyzeImageOnly = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    sendError(res, 'No image file uploaded. Please provide a valid JPEG, PNG, or WEBP image.', null, 400);
    return;
  }

  try {
    const { productCategory } = req.body;
    const visionResult = await analyzeImageWithVisionService(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      productCategory
    );

    sendSuccess(res, 'Image visual analysis complete.', visionResult);
  } catch (error: any) {
    logger.error('[VisionController] Image analysis error:', error.message);
    sendError(res, 'Failed to process visual image analysis.', error.message, 500);
  }
};

/**
 * POST /api/vision/multimodal
 * Analyzes customer text sentiment AND attached product image, running
 * cross-modal consistency correlation and persisting to MongoDB Analysis.
 */
export const analyzeMultimodalCombined = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  const text = (req.body.text || '').trim();
  const productCategory = req.body.productCategory || req.body.category || 'General';

  if (!user || !user._id) {
    sendError(res, 'Unauthorized access.', 'AuthError', 401);
    return;
  }

  if (!text) {
    sendError(res, 'Text feedback is required for multimodal review analysis.', null, 400);
    return;
  }

  try {
    // 1. Text Sentiment Analysis via Multi-Model Consensus (Gemini, Groq, HuggingFace)
    const savedRecord = await runMultiModelAnalysis(user._id, text);

    let visualAnalysisData: any = undefined;
    let multimodalCorrelation: any = undefined;

    // 2. If Image is Attached, Process Visual Pipeline
    if (req.file) {
      const imageId = crypto.randomUUID();
      const ext = path.extname(req.file.originalname) || '.jpg';
      const diskFilename = `${imageId}${ext}`;
      const diskPath = path.join(UPLOADS_DIR, diskFilename);

      // Save file locally for retrieval / preview
      fs.writeFileSync(diskPath, req.file.buffer);

      const visionResult = await analyzeImageWithVisionService(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        productCategory
      );

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
      multimodalCorrelation = correlateTextAndVision(
        text,
        savedRecord.finalSentiment,
        visionResult.label,
        visionResult.confidence,
        visionResult.imageQuality.usable,
        visionResult.imageQuality.reason,
        visionResult.multipleDefects
      );

      // Update the saved record with visual intelligence data
      savedRecord.visualAnalysis = visualAnalysisData;
      savedRecord.multimodalAnalysis = multimodalCorrelation;
      await savedRecord.save();
    }

    sendSuccess(res, 'Multimodal intelligence analysis completed.', {
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
  } catch (error: any) {
    logger.error('[VisionController] Multimodal analysis error:', error.message);
    sendError(res, 'Failed to process multimodal analysis.', error.message, 500);
  }
};

/**
 * POST /api/vision/feedback
 * Records human-in-the-loop validation (isCorrect, correctedLabel)
 */
export const recordVisionFeedback = async (req: Request, res: Response): Promise<void> => {
  const { analysisId, isCorrect, correctedLabel } = req.body;

  if (!analysisId) {
    sendError(res, 'analysisId is required to submit feedback.', null, 400);
    return;
  }

  try {
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      sendError(res, 'Analysis record not found.', null, 404);
      return;
    }

    if (!analysis.visualAnalysis) {
      sendError(res, 'This analysis does not contain a visual intelligence component.', null, 400);
      return;
    }

    analysis.visualAnalysis.userFeedback = {
      isCorrect: Boolean(isCorrect),
      correctedLabel: correctedLabel || undefined,
      timestamp: new Date(),
    };

    await analysis.save();

    sendSuccess(res, 'Visual intelligence feedback recorded successfully.', {
      feedback: analysis.visualAnalysis.userFeedback,
    });
  } catch (error: any) {
    logger.error('[VisionController] Feedback error:', error.message);
    sendError(res, 'Failed to submit visual feedback.', error.message, 500);
  }
};

/**
 * GET /api/vision/stats
 * Aggregates visual defect distribution and duplicate rates
 */
export const getVisionStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await Analysis.find({ 'visualAnalysis': { $exists: true, $ne: null } });

    const totalVisualAnalyses = records.length;
    const defectDistribution: Record<string, number> = {
      NORMAL: 0,
      PHYSICAL_DAMAGE: 0,
      SCRATCH: 0,
      CRACK: 0,
      BROKEN_COMPONENT: 0,
      PACKAGING_DAMAGE: 0,
      OTHER_ISSUE: 0,
      UNKNOWN: 0,
    };

    const seenHashes = new Set<string>();
    let duplicateImageCount = 0;

    records.forEach(r => {
      const v = r.visualAnalysis;
      if (v) {
        if (defectDistribution[v.label] !== undefined) {
          defectDistribution[v.label]++;
        } else {
          defectDistribution['OTHER_ISSUE']++;
        }

        if (v.imageHash) {
          if (seenHashes.has(v.imageHash)) {
            duplicateImageCount++;
          } else {
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

    sendSuccess(res, 'Vision statistics retrieved successfully.', {
      totalVisualAnalyses,
      duplicateImageCount,
      uniqueImageCount: seenHashes.size,
      breakdown,
    });
  } catch (error: any) {
    logger.error('[VisionController] Stats error:', error.message);
    sendError(res, 'Failed to compile vision statistics.', error.message, 500);
  }
};
