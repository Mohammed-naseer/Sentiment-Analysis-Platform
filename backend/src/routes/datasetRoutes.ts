import { Router } from 'express';
import { verifyToken as authenticateUser } from '../middleware/auth';
import {
  uploadAndProfileDataset,
  getUserDatasets,
  getDatasetProfile,
  startDatasetAnalysis,
  getJobStatus,
  getUserJobs
} from '../controllers/datasetController';


const router = Router();

// Protect all dataset routes with JWT authentication
router.use(authenticateUser);

router.post('/upload', uploadAndProfileDataset);
router.get('/', getUserDatasets);
router.get('/:id/profile', getDatasetProfile);
router.post('/:id/analyze', startDatasetAnalysis);
router.get('/jobs', getUserJobs);
router.get('/jobs/:jobId', getJobStatus);

export default router;

