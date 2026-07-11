import { Router } from 'express';
import { getHistory, deleteHistoryItem } from '../controllers/historyController';
import { verifyToken } from '../middleware/auth';
import { deleteHistoryValidation } from '../middleware/validation';

const router = Router();

// GET /api/history - Retrieve list of past analyses
router.get('/', verifyToken, getHistory);

// DELETE /api/history/:id - Delete analysis log
router.delete('/:id', verifyToken, deleteHistoryValidation, deleteHistoryItem);

export default router;
