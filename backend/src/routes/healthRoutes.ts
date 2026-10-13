import { Router } from 'express';
import { getAIHealth } from '../controllers/healthController';
import { verifyToken, verifyAdmin } from '../middleware/auth';

const router = Router();

// GET /api/health — Public endpoint for liveness/readiness checks
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'AI Sentiment Analysis Backend',
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health/ai — Admin-only AI provider health check
router.get('/ai', verifyToken, verifyAdmin, getAIHealth);

export default router;
