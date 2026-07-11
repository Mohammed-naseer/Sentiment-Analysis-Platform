import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { verifyToken } from '../middleware/auth';
import { profileUpdateValidation } from '../middleware/validation';

const router = Router();

// GET /api/profile - Retrieve details of active profile
router.get('/', verifyToken, getProfile);

// PUT /api/profile - Modify name and image parameters
router.put('/', verifyToken, profileUpdateValidation, updateProfile);

export default router;
