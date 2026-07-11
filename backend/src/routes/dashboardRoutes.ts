import { Router } from 'express';
import { getStats } from '../controllers/dashboardController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// GET /api/dashboard - Fetch dashboard charts and aggregation stats
router.get('/', verifyToken, getStats);

export default router;
