"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const datasetController_1 = require("../controllers/datasetController");
const router = (0, express_1.Router)();
// Protect all dataset routes with JWT authentication
router.use(auth_1.verifyToken);
router.post('/upload', datasetController_1.uploadAndProfileDataset);
router.get('/', datasetController_1.getUserDatasets);
router.get('/:id/profile', datasetController_1.getDatasetProfile);
router.post('/:id/analyze', datasetController_1.startDatasetAnalysis);
router.get('/jobs', datasetController_1.getUserJobs);
router.get('/jobs/:jobId', datasetController_1.getJobStatus);
exports.default = router;
