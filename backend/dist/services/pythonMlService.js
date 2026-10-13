"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithPythonMl = exports.predictWithPythonMl = exports.checkPythonMlHealth = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Check health status of Python Deep Learning Microservice
 */
const checkPythonMlHealth = async () => {
    try {
        const response = await axios_1.default.get(`${env_1.config.pythonMlServiceUrl}/health`, { timeout: 3000 });
        return response.status === 200 && response.data?.status === 'healthy';
    }
    catch (error) {
        logger_1.default.warn(`[PythonMlService] Health check failed at ${env_1.config.pythonMlServiceUrl}: ${error.message}`);
        return false;
    }
};
exports.checkPythonMlHealth = checkPythonMlHealth;
/**
 * Predict sentiment using Python CNN/LSTM/RoBERTa ensemble
 */
const predictWithPythonMl = async (text, model = 'ensemble') => {
    try {
        const response = await axios_1.default.post(`${env_1.config.pythonMlServiceUrl}/predict`, { text, model }, { timeout: 10000 });
        return response.data;
    }
    catch (error) {
        logger_1.default.error(`[PythonMlService] Predict error: ${error.message}`);
        throw error;
    }
};
exports.predictWithPythonMl = predictWithPythonMl;
/**
 * Full deep analysis with model agreements & emotion detection
 */
const analyzeWithPythonMl = async (text) => {
    try {
        const response = await axios_1.default.post(`${env_1.config.pythonMlServiceUrl}/analyze`, { text }, { timeout: 15000 });
        return response.data;
    }
    catch (error) {
        logger_1.default.error(`[PythonMlService] Full analysis error: ${error.message}`);
        throw error;
    }
};
exports.analyzeWithPythonMl = analyzeWithPythonMl;
