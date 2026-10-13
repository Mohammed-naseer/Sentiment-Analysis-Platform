"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMultimodal = void 0;
const multer_1 = __importDefault(require("multer"));
const audioSpeechService_1 = require("../services/audioSpeechService");
const multimodalEmotionEngine_1 = require("../services/multimodalEmotionEngine");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
const upload = (0, multer_1.default)({
    limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
}).single('audio');
const analyzeMultimodal = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            logger_1.default.error('[MultimodalController] Upload error:', err.message);
            return (0, response_1.sendError)(res, err.message, null, 400);
        }
        try {
            const textInput = (req.body?.text || '').trim();
            const audioFile = req.file;
            if (!textInput && !audioFile) {
                return (0, response_1.sendError)(res, 'Please provide text input or record audio to analyze.', null, 400);
            }
            let transcript = textInput;
            let audioMetrics = undefined;
            if (audioFile) {
                const audioResult = await (0, audioSpeechService_1.processAudioInput)(audioFile.buffer, audioFile.mimetype || 'audio/webm', textInput);
                transcript = audioResult.transcript || textInput;
                audioMetrics = {
                    ...audioResult.acousticMetrics,
                    durationSeconds: audioResult.durationSeconds
                };
            }
            const results = (0, multimodalEmotionEngine_1.analyzeMultimodalEmotion)(transcript, audioMetrics);
            return (0, response_1.sendSuccess)(res, 'Multimodal Voice & Text Emotion Analysis complete.', results);
        }
        catch (error) {
            logger_1.default.error('[MultimodalController] Analysis error:', error.message);
            return (0, response_1.sendError)(res, 'Failed to process multimodal emotion analysis.', error.message, 500);
        }
    });
};
exports.analyzeMultimodal = analyzeMultimodal;
