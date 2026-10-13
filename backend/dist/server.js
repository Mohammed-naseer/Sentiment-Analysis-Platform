"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
// Force Node.js to use Google/Cloudflare DNS to resolve MongoDB Atlas SRV records
// (ISP/corporate DNS may block these records)
dns_1.default.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const aiHealthService_1 = require("./services/aiHealthService");
/**
 * Main Bootstrap Entry Point
 * 1. Validate environment variables
 * 2. Connect to MongoDB Atlas
 * 3. Start HTTP server
 * 4. Run AI provider health check
 */
const bootstrap = async () => {
    // Step 1: Run environment variable validation and log warnings
    (0, env_1.validateConfig)();
    // Step 2: Connect to MongoDB Atlas
    await (0, database_1.connectDB)();
    // Step 3: Start Express HTTP server
    const PORT = env_1.config.port;
    const server = app_1.default.listen(PORT, () => {
        console.log('=================================');
        console.log(`🚀 Server running in ${env_1.config.nodeEnv} mode`);
        console.log(`🔊 Listening on http://localhost:${PORT}`);
        console.log(`🗄️  Database: MongoDB Atlas`);
        console.log(`🤖 AI Models: Gemini | Groq | HuggingFace`);
        console.log('=================================');
    });
    // Step 4: AI provider health check (runs after server is up, non-blocking)
    (0, aiHealthService_1.logStartupAIHealth)().catch((err) => {
        console.error('[Server] AI health check error during startup:', err?.message);
    });
    // Graceful shutdown handlers
    const handleShutdown = async (signal) => {
        console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
        await (0, database_1.disconnectDB)();
        server.close(() => {
            console.log('[Server] HTTP server closed.');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => { handleShutdown('SIGTERM'); });
    process.on('SIGINT', () => { handleShutdown('SIGINT'); });
    // Catch unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        console.error('[Server] Unhandled Rejection:', reason);
        server.close(() => process.exit(1));
    });
};
// Run the bootstrap function
bootstrap().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
});
