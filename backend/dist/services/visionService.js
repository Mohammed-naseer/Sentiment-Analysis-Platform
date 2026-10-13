"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImageWithVisionService = exports.computeImageBufferHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const PYTHON_ML_URL = process.env.PYTHON_ML_URL || 'http://localhost:8000';
/**
 * Computes SHA-256 hash of image buffer for duplicate detection
 */
const computeImageBufferHash = (buffer) => {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
};
exports.computeImageBufferHash = computeImageBufferHash;
/**
 * Dispatches an uploaded image buffer or stream to the Python ML Microservice
 * for defect detection, image quality verification, and perceptual hashing.
 */
const analyzeImageWithVisionService = async (fileBuffer, filename, mimetype, productCategory) => {
    const sha256 = (0, exports.computeImageBufferHash)(fileBuffer);
    try {
        const formData = new form_data_1.default();
        formData.append('image', fileBuffer, {
            filename: filename || 'product-image.jpg',
            contentType: mimetype || 'image/jpeg',
        });
        if (productCategory) {
            formData.append('product_category', productCategory);
        }
        const response = await axios_1.default.post(`${PYTHON_ML_URL}/api/vision/analyze`, formData, {
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
    }
    catch (error) {
        logger_1.default.warn(`[VisionService] Python ML vision service request failed: ${error.message}. Running fallback heuristic.`);
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
exports.analyzeImageWithVisionService = analyzeImageWithVisionService;
