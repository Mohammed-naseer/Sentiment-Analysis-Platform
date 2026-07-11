import { Router } from 'express';
import { analyze } from '../controllers/sentimentController';
import { verifyToken } from '../middleware/auth';
import { sentimentValidation } from '../middleware/validation';

const router = Router();

// POST /api/sentiment/analyze - Run analysis on text inputs
router.post('/analyze', verifyToken, sentimentValidation, analyze);

export default router;
