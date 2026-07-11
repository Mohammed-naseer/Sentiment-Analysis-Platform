import dns from 'dns';
// Force Node.js to use Google/Cloudflare DNS to resolve MongoDB Atlas SRV records
// (ISP/corporate DNS may block these records)
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

import app from './app';

import { config, validateConfig } from './config/env';
import { connectDB, disconnectDB } from './config/database';

/**
 * Main Bootstrap Entry Point
 * 1. Validate environment variables
 * 2. Connect to MongoDB Atlas
 * 3. Start HTTP server
 */
const bootstrap = async (): Promise<void> => {
  // Step 1: Run environment variable validation and log warnings
  validateConfig();

  // Step 2: Connect to MongoDB Atlas
  await connectDB();

  // Step 3: Start Express HTTP server
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running in ${config.nodeEnv} mode`);
    console.log(`🔊 Listening on http://localhost:${PORT}`);
    console.log(`🗄️  Database: MongoDB Atlas`);
    console.log(`🤖 AI Models: Gemini | Groq | HuggingFace`);
    console.log('=================================');
  });

  // Graceful shutdown handlers
  const handleShutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    await disconnectDB();
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => { handleShutdown('SIGTERM'); });
  process.on('SIGINT', () => { handleShutdown('SIGINT'); });

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[Server] Unhandled Rejection:', reason);
    server.close(() => process.exit(1));
  });
};

// Run the bootstrap function
bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
