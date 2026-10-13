import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { analyzeMultimodal } from '../controllers/multimodalController';

const router = Router();

// Protect multimodal route with authentication
router.use(verifyToken);

// POST /api/multimodal/analyze — Text & Voice Emotion Analysis
router.post('/analyze', analyzeMultimodal);

export default router;
