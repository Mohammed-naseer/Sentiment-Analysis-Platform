"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const sentimentRoutes_1 = __importDefault(require("./routes/sentimentRoutes"));
const historyRoutes_1 = __importDefault(require("./routes/historyRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const app = (0, express_1.default)();
// 1. Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        // Allow any localhost port in development
        if (env_1.config.nodeEnv === 'development' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
            return callback(null, true);
        }
        const allowedOrigins = [env_1.config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'];
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
// Rate Limiting to prevent API abuse
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable older X-RateLimit headers
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.',
        error: 'RateLimitError',
    },
});
app.use('/api/', limiter);
// 2. Request Parsing Middlewares
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 3. Logger Middleware
if (env_1.config.nodeEnv === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// 4. Base Status Route
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy and running.',
        data: {
            uptime: process.uptime(),
            timestamp: new Date(),
        },
    });
});
// 5. Mount API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/sentiment', sentimentRoutes_1.default);
app.use('/api/history', historyRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// 6. 404 Route Handler
app.use(errorHandler_1.notFoundHandler);
// 7. Global Error Handler Middleware
app.use(errorHandler_1.errorHandler);
exports.default = app;
