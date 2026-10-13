"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserJobs = exports.getJobStatus = exports.startDatasetAnalysis = exports.getDatasetProfile = exports.getUserDatasets = exports.uploadAndProfileDataset = void 0;
const multer_1 = __importStar(require("multer"));
const Dataset_1 = require("../models/Dataset");
const AnalysisJob_1 = require("../models/AnalysisJob");
const dataProfilerService_1 = require("../services/dataProfilerService");
const recommendationEngine_1 = require("../services/recommendationEngine");
const jobProcessingService_1 = require("../services/jobProcessingService");
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
// Configure Multer with explicit memory storage (required in multer v2+)
const upload = (0, multer_1.default)({
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max limit
    fileFilter: (_req, file, cb) => {
        const validExts = ['.csv', '.xlsx', '.xls', '.json', '.txt', '.pdf'];
        const lowerName = file.originalname.toLowerCase();
        if (validExts.some(ext => lowerName.endsWith(ext))) {
            cb(null, true);
        }
        else {
            cb(new Error('Unsupported file format. Allowed: CSV, XLSX, XLS, JSON, TXT, PDF.'));
        }
    }
}).single('file');
const uploadAndProfileDataset = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            logger_1.default.error('[DatasetController] Upload error:', err.message);
            return (0, response_1.sendError)(res, err.message, null, 400);
        }
        if (!req.file || req.file.size === 0 || !req.file.buffer || req.file.buffer.length === 0) {
            return (0, response_1.sendError)(res, 'Uploaded dataset file is empty. Please attach a valid file with tabular data.', 'EmptyFileError', 400);
        }
        try {
            const userId = req.user._id;
            const { profile, parsedRows } = await (0, dataProfilerService_1.profileDatasetFile)(req.file.buffer, req.file.originalname, req.file.mimetype);
            if (!parsedRows || parsedRows.length === 0) {
                return (0, response_1.sendError)(res, 'Dataset file contains no valid rows of data.', 'EmptyDatasetError', 400);
            }
            // Save Dataset Document in MongoDB
            const datasetDoc = new Dataset_1.Dataset({
                userId,
                fileName: req.file.originalname,
                fileType: profile.fileType,
                fileSize: req.file.size,
                profile,
                sampleData: parsedRows.slice(0, 500) // Keep up to 500 sample records for instant preview & job processing
            });
            await datasetDoc.save();
            logger_1.default.info(`[DatasetController] Dataset uploaded and profiled. ID: ${datasetDoc._id}`);
            const recommendations = (0, recommendationEngine_1.generateAnalysisRecommendations)(profile);
            return (0, response_1.sendSuccess)(res, 'Dataset uploaded and profiled successfully.', {
                datasetId: datasetDoc._id,
                fileName: datasetDoc.fileName,
                profile: datasetDoc.profile,
                sampleData: parsedRows.slice(0, 5),
                recommendations
            }, 201);
        }
        catch (error) {
            logger_1.default.error('[DatasetController] Profiling failed:', error.message);
            const isClientError = error.message?.includes('empty') || error.message?.includes('could not be parsed') || error.message?.includes('unsupported');
            return (0, response_1.sendError)(res, error.message || 'Failed to inspect and profile dataset file.', error.name || 'DatasetProfileError', isClientError ? 400 : 500);
        }
    });
};
exports.uploadAndProfileDataset = uploadAndProfileDataset;
const getUserDatasets = async (req, res) => {
    try {
        const userId = req.user._id;
        const datasets = await Dataset_1.Dataset.find({ userId }).sort({ createdAt: -1 }).select('-sampleData');
        return (0, response_1.sendSuccess)(res, 'User datasets retrieved successfully.', datasets);
    }
    catch (error) {
        logger_1.default.error('[DatasetController] Failed to fetch datasets:', error.message);
        return (0, response_1.sendError)(res, 'Failed to retrieve datasets.', error.message, 500);
    }
};
exports.getUserDatasets = getUserDatasets;
const getDatasetProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const dataset = await Dataset_1.Dataset.findById(id);
        if (!dataset) {
            return (0, response_1.sendError)(res, 'Dataset not found.', null, 404);
        }
        const recommendations = (0, recommendationEngine_1.generateAnalysisRecommendations)(dataset.profile);
        return (0, response_1.sendSuccess)(res, 'Dataset profile retrieved.', {
            dataset,
            recommendations
        });
    }
    catch (error) {
        logger_1.default.error('[DatasetController] Profile fetch error:', error.message);
        return (0, response_1.sendError)(res, 'Failed to fetch dataset profile.', error.message, 500);
    }
};
exports.getDatasetProfile = getDatasetProfile;
const startDatasetAnalysis = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { selectedAnalyses } = req.body;
        const dataset = await Dataset_1.Dataset.findById(id);
        if (!dataset) {
            return (0, response_1.sendError)(res, 'Dataset not found.', null, 404);
        }
        // Create Analysis Job
        const job = new AnalysisJob_1.AnalysisJob({
            userId,
            datasetId: dataset._id,
            status: 'queued',
            progress: 0,
            totalRows: dataset.profile.totalRows,
            processedRows: 0,
            selectedAnalyses: selectedAnalyses || ['sentiment_analysis', 'emotion_analysis', 'aspect_analysis', 'emerging_issues']
        });
        await job.save();
        logger_1.default.info(`[DatasetController] Analysis Job queued. JobID: ${job._id}`);
        // Trigger async job execution in background
        (0, jobProcessingService_1.processAnalysisJobAsync)(job._id.toString()).catch(err => {
            logger_1.default.error('[DatasetController] Background job error:', err.message);
        });
        return (0, response_1.sendSuccess)(res, 'Analysis job queued successfully.', {
            jobId: job._id,
            status: job.status,
            progress: job.progress
        }, 202);
    }
    catch (error) {
        logger_1.default.error('[DatasetController] Failed to start analysis:', error.message);
        return (0, response_1.sendError)(res, 'Failed to initiate analysis job.', error.message, 500);
    }
};
exports.startDatasetAnalysis = startDatasetAnalysis;
const getJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await AnalysisJob_1.AnalysisJob.findById(jobId);
        if (!job) {
            return (0, response_1.sendError)(res, 'Analysis job not found.', null, 404);
        }
        return (0, response_1.sendSuccess)(res, 'Job status retrieved.', {
            jobId: job._id,
            status: job.status,
            progress: job.progress,
            totalRows: job.totalRows,
            processedRows: job.processedRows,
            results: job.results,
            errorMessage: job.errorMessage
        });
    }
    catch (error) {
        logger_1.default.error('[DatasetController] Job status error:', error.message);
        return (0, response_1.sendError)(res, 'Failed to fetch job status.', error.message, 500);
    }
};
exports.getJobStatus = getJobStatus;
const getUserJobs = async (req, res) => {
    try {
        const userId = req.user._id;
        const jobs = await AnalysisJob_1.AnalysisJob.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('datasetId', 'fileName fileType profile.totalRows')
            .select('-results.modelDisagreements') // omit heavy fields for listing
            .lean();
        const formatted = jobs.map((j) => ({
            jobId: j._id,
            status: j.status,
            progress: j.progress,
            totalRows: j.totalRows,
            processedRows: j.processedRows,
            createdAt: j.createdAt,
            fileName: j.datasetId?.fileName ?? 'Unknown Dataset',
            fileType: j.datasetId?.fileType ?? '',
            errorMessage: j.errorMessage,
            executiveSummary: j.results?.executiveSummary ?? null,
            discoveredProblemsCount: j.results?.discoveredProblems?.length ?? 0,
            prioritizedSolutionsCount: j.results?.prioritizedSolutions?.length ?? 0,
        }));
        return (0, response_1.sendSuccess)(res, 'User jobs retrieved successfully.', formatted);
    }
    catch (error) {
        logger_1.default.error('[DatasetController] Failed to fetch user jobs:', error.message);
        return (0, response_1.sendError)(res, 'Failed to retrieve analysis jobs.', error.message, 500);
    }
};
exports.getUserJobs = getUserJobs;
