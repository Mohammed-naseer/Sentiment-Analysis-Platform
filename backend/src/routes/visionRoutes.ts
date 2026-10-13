import { Router } from 'express';
import {
  analyzeImageOnly,
  analyzeMultimodalCombined,
  recordVisionFeedback,
  getVisionStats,
  visionUploadMiddleware,
} from '../controllers/visionController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// 1. Standalone image analysis (supports optional auth)
router.post('/analyze', visionUploadMiddleware, analyzeImageOnly);

// 2. Multimodal review analysis (text + optional image)
router.post('/multimodal', verifyToken, visionUploadMiddleware, analyzeMultimodalCombined);

// 3. Human-in-the-loop feedback submission
router.post('/feedback', verifyToken, recordVisionFeedback);

// 4. Vision intelligence summary metrics for dashboards
router.get('/stats', verifyToken, getVisionStats);

export default router;
