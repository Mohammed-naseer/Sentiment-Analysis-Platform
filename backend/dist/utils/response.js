"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
/**
 * Sends a standardized success response
 */
const sendSuccess = (res, message, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};
exports.sendSuccess = sendSuccess;
/**
 * Sends a standardized error response
 */
const sendError = (res, message, error = '', statusCode = 500) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return res.status(statusCode).json({
        success: false,
        message,
        error: errorMsg,
    });
};
exports.sendError = sendError;
