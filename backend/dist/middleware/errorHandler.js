"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const response_1 = require("../utils/response");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Global centralized error handler middleware
 */
const errorHandler = (err, _req, res, _next) => {
    logger_1.default.error('[ErrorHandler] Unhandled error occurred:', err);
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errorDetails = process.env.NODE_ENV === 'development' ? err.stack || err : '';
    (0, response_1.sendError)(res, message, errorDetails, statusCode);
};
exports.errorHandler = errorHandler;
/**
 * 404 Not Found route handler middleware
 */
const notFoundHandler = (req, res, _next) => {
    (0, response_1.sendError)(res, `Route not found - ${req.originalUrl}`, 'NotFoundError', 404);
};
exports.notFoundHandler = notFoundHandler;
