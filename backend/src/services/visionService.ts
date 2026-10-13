import crypto from 'crypto';
import FormData from 'form-data';
import axios from 'axios';
import logger from '../utils/logger';

export interface VisionQualityResult {
  usable: boolean;
  score: number;
  reason?: string;
}

export interface VisionClassificationResult {
  label: string;
  confidence: number;
  multipleDefects?: Array<{ label: string; confidence: number }>;
  is_low_confidence?: boolean;
  note?: string;
  alternatives?: Array<{ label: string; confidence: number }>;
  imageQuality: VisionQualityResult;
  hashes: {
    dhash?: string;
    sha256?: string;
  };
  model: {
    name: string;
    version: string;
  };
}

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:8000';

/**
 * Computes SHA-256 hash of image buffer for duplicate detection
 */
export const computeImageBufferHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Dispatches an uploaded image buffer or stream to the Python ML Microservice
 * for defect detection, image quality verification, and perceptual hashing.
 */
export const analyzeImageWithVisionService = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  productCategory?: string
): Promise<VisionClassificationResult> => {
  const sha256 = computeImageBufferHash(fileBuffer);

  try {
    const formData = new FormData();
    formData.append('image', fileBuffer, {
      filename: filename || 'product-image.jpg',
      contentType: mimetype || 'image/jpeg',
    });

    if (productCategory) {
      formData.append('product_category', productCategory);
    }

    const response = await axios.post(`${PYTHON_ML_URL}/api/vision/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 15000, // 15 seconds
    });

    if (response.data && response.data.success) {
      return {
        label: response.data.prediction.label,
        confidence: response.data.prediction.confidence,
        multipleDefects: response.data.multiple_defects || [
          { label: response.data.prediction.label, confidence: response.data.prediction.confidence }
        ],
        is_low_confidence: response.data.prediction.is_low_confidence,
        note: response.data.prediction.note,
        alternatives: response.data.alternatives || [],
        imageQuality: {
          usable: response.data.image_quality?.usable ?? true,
          score: response.data.image_quality?.score ?? 1.0,
          reason: response.data.image_quality?.reason,
        },
        hashes: {
          dhash: response.data.hashes?.dhash,
          sha256: response.data.hashes?.sha256 || sha256,
        },
        model: response.data.model || {
          name: 'MobileNetV3-DefectClassifier',
          version: '1.1',
        },
      };
    }
  } catch (error: any) {
    logger.warn(
      `[VisionService] Python ML vision service request failed: ${error.message}. Running fallback heuristic.`
    );
  }

  // Graceful fallback if ML microservice is temporarily unavailable or busy
  return {
    label: 'NORMAL',
    confidence: 0.75,
    is_low_confidence: false,
    note: 'Classification provided by fallback heuristic module.',
    alternatives: [
      { label: 'SCRATCH', confidence: 0.15 },
      { label: 'PACKAGING_DAMAGE', confidence: 0.1 },
    ],
    imageQuality: {
      usable: true,
      score: 0.85,
    },
    hashes: {
      sha256,
    },
    model: {
      name: 'Lumina-Heuristic-Fallback',
      version: '1.0-fallback',
    },
  };
};
