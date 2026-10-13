"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHistoryValidation = exports.profileUpdateValidation = exports.sentimentValidation = exports.googleLoginValidation = exports.loginValidation = exports.registerValidation = exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const response_1 = require("../utils/response");
/**
 * Middleware runner to inspect express-validator results
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors
            .array()
            .map(err => `${err.type === 'field' ? err.path : 'param'}: ${err.msg}`)
            .join(', ');
        (0, response_1.sendError)(res, 'Validation failed.', errorMsg, 400);
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
exports.registerValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required.'),
    (0, express_validator_1.body)('photoURL').optional().isURL().withMessage('Photo URL must be a valid URL.'),
    exports.validateRequest
];
exports.loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required.'),
    exports.validateRequest
];
exports.googleLoginValidation = [
    (0, express_validator_1.body)('idToken').notEmpty().withMessage('Firebase ID token is required.'),
    exports.validateRequest
];
exports.sentimentValidation = [
    (0, express_validator_1.body)('text').trim().notEmpty().withMessage('Text content is required for analysis.'),
    (0, express_validator_1.body)('text').isLength({ max: 8000 }).withMessage('Text exceeds maximum length of 8,000 characters. Please shorten the input.'),
    exports.validateRequest
];
exports.profileUpdateValidation = [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name must not be empty.'),
    (0, express_validator_1.body)('photoURL').optional().isURL().withMessage('Photo URL must be a valid URL.'),
    exports.validateRequest
];
exports.deleteHistoryValidation = [
    (0, express_validator_1.param)('id').isMongoId().withMessage('Please provide a valid MongoDB Analysis ID.'),
    exports.validateRequest
];
