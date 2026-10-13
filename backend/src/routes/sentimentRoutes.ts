import { Router } from 'express';
import { analyze, mlAnalyze } from '../controllers/sentimentController';
import { verifyToken } from '../middleware/auth';
import { sentimentValidation } from '../middleware/validation';

const router = Router();

// POST /api/sentiment/analyze - Run LLM / cloud analysis on text inputs
router.post('/analyze', verifyToken, sentimentValidation, analyze);

// POST /api/sentiment/ml-analyze - Run Python DL (CNN/LSTM/RoBERTa/Ensemble) analysis
router.post('/ml-analyze', verifyToken, sentimentValidation, mlAnalyze);

export default router;
