import { Request, Response } from 'express';
import multer from 'multer';
import { processAudioInput } from '../services/audioSpeechService';
import { analyzeMultimodalEmotion } from '../services/multimodalEmotionEngine';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
}).single('audio');

export const analyzeMultimodal = (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      logger.error('[MultimodalController] Upload error:', err.message);
      return sendError(res, err.message, null, 400);
    }

    try {
      const textInput = (req.body?.text || '').trim();
      const audioFile = req.file;

      if (!textInput && !audioFile) {
        return sendError(res, 'Please provide text input or record audio to analyze.', null, 400);
      }

      let transcript = textInput;
      let audioMetrics: any = undefined;

      if (audioFile) {
        const audioResult = await processAudioInput(
          audioFile.buffer,
          audioFile.mimetype || 'audio/webm',
          textInput
        );
        transcript = audioResult.transcript || textInput;
        audioMetrics = {
          ...audioResult.acousticMetrics,
          durationSeconds: audioResult.durationSeconds
        };
      }

      const results = analyzeMultimodalEmotion(transcript, audioMetrics);

      return sendSuccess(res, 'Multimodal Voice & Text Emotion Analysis complete.', results);
    } catch (error: any) {
      logger.error('[MultimodalController] Analysis error:', error.message);
      return sendError(res, 'Failed to process multimodal emotion analysis.', error.message, 500);
    }
  });
};
