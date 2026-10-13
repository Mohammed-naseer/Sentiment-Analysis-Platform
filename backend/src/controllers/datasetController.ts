import { Request, Response } from 'express';
import multer, { memoryStorage } from 'multer';
import { Dataset } from '../models/Dataset';
import { AnalysisJob } from '../models/AnalysisJob';
import { profileDatasetFile } from '../services/dataProfilerService';
import { generateAnalysisRecommendations } from '../services/recommendationEngine';
import { processAnalysisJobAsync } from '../services/jobProcessingService';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

// Configure Multer with explicit memory storage (required in multer v2+)
const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max limit
  fileFilter: (_req, file, cb) => {
    const validExts = ['.csv', '.xlsx', '.xls', '.json', '.txt', '.pdf'];
    const lowerName = file.originalname.toLowerCase();
    if (validExts.some(ext => lowerName.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Allowed: CSV, XLSX, XLS, JSON, TXT, PDF.'));
    }
  }
}).single('file');

export const uploadAndProfileDataset = (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      logger.error('[DatasetController] Upload error:', err.message);
      return sendError(res, err.message, null, 400);
    }

    if (!req.file || req.file.size === 0 || !req.file.buffer || req.file.buffer.length === 0) {
      return sendError(res, 'Uploaded dataset file is empty. Please attach a valid file with tabular data.', 'EmptyFileError', 400);
    }

    try {
      const userId = (req as any).user._id;
      const { profile, parsedRows } = await profileDatasetFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (!parsedRows || parsedRows.length === 0) {
        return sendError(res, 'Dataset file contains no valid rows of data.', 'EmptyDatasetError', 400);
      }

      // Save Dataset Document in MongoDB
      const datasetDoc = new Dataset({
        userId,
        fileName: req.file.originalname,
        fileType: profile.fileType,
        fileSize: req.file.size,
        profile,
        sampleData: parsedRows.slice(0, 500) // Keep up to 500 sample records for instant preview & job processing
      });

      await datasetDoc.save();
      logger.info(`[DatasetController] Dataset uploaded and profiled. ID: ${datasetDoc._id}`);

      const recommendations = generateAnalysisRecommendations(profile);

      return sendSuccess(res, 'Dataset uploaded and profiled successfully.', {
        datasetId: datasetDoc._id,
        fileName: datasetDoc.fileName,
        profile: datasetDoc.profile,
        sampleData: parsedRows.slice(0, 5),
        recommendations
      }, 201);
    } catch (error: any) {
      logger.error('[DatasetController] Profiling failed:', error.message);
      const isClientError = error.message?.includes('empty') || error.message?.includes('could not be parsed') || error.message?.includes('unsupported');
      return sendError(res, error.message || 'Failed to inspect and profile dataset file.', error.name || 'DatasetProfileError', isClientError ? 400 : 500);
    }
  });
};

export const getUserDatasets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const datasets = await Dataset.find({ userId }).sort({ createdAt: -1 }).select('-sampleData');
    return sendSuccess(res, 'User datasets retrieved successfully.', datasets);
  } catch (error: any) {
    logger.error('[DatasetController] Failed to fetch datasets:', error.message);
    return sendError(res, 'Failed to retrieve datasets.', error.message, 500);
  }
};

export const getDatasetProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataset = await Dataset.findById(id);

    if (!dataset) {
      return sendError(res, 'Dataset not found.', null, 404);
    }

    const recommendations = generateAnalysisRecommendations(dataset.profile);

    return sendSuccess(res, 'Dataset profile retrieved.', {
      dataset,
      recommendations
    });
  } catch (error: any) {
    logger.error('[DatasetController] Profile fetch error:', error.message);
    return sendError(res, 'Failed to fetch dataset profile.', error.message, 500);
  }
};

export const startDatasetAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;
    const { selectedAnalyses } = req.body;

    const dataset = await Dataset.findById(id);
    if (!dataset) {
      return sendError(res, 'Dataset not found.', null, 404);
    }

    // Create Analysis Job
    const job = new AnalysisJob({
      userId,
      datasetId: dataset._id,
      status: 'queued',
      progress: 0,
      totalRows: dataset.profile.totalRows,
      processedRows: 0,
      selectedAnalyses: selectedAnalyses || ['sentiment_analysis', 'emotion_analysis', 'aspect_analysis', 'emerging_issues']
    });

    await job.save();
    logger.info(`[DatasetController] Analysis Job queued. JobID: ${job._id}`);

    // Trigger async job execution in background
    processAnalysisJobAsync(job._id.toString()).catch(err => {
      logger.error('[DatasetController] Background job error:', err.message);
    });

    return sendSuccess(res, 'Analysis job queued successfully.', {
      jobId: job._id,
      status: job.status,
      progress: job.progress
    }, 202);
  } catch (error: any) {
    logger.error('[DatasetController] Failed to start analysis:', error.message);
    return sendError(res, 'Failed to initiate analysis job.', error.message, 500);
  }
};

export const getJobStatus = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await AnalysisJob.findById(jobId);

    if (!job) {
      return sendError(res, 'Analysis job not found.', null, 404);
    }

    return sendSuccess(res, 'Job status retrieved.', {
      jobId: job._id,
      status: job.status,
      progress: job.progress,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      results: job.results,
      errorMessage: job.errorMessage
    });
  } catch (error: any) {
    logger.error('[DatasetController] Job status error:', error.message);
    return sendError(res, 'Failed to fetch job status.', error.message, 500);
  }
};
export const getUserJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const jobs = await AnalysisJob.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('datasetId', 'fileName fileType profile.totalRows')
      .select('-results.modelDisagreements') // omit heavy fields for listing
      .lean();

    const formatted = jobs.map((j: any) => ({
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

    return sendSuccess(res, 'User jobs retrieved successfully.', formatted);
  } catch (error: any) {
    logger.error('[DatasetController] Failed to fetch user jobs:', error.message);
    return sendError(res, 'Failed to retrieve analysis jobs.', error.message, 500);
  }
};
