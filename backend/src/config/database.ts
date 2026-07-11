import mongoose from 'mongoose';
import { config } from './env';

let mongod: any = null;

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 15000, // 15s timeout for Atlas connection
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`\x1b[31m[Database] Primary MongoDB connection error:\x1b[0m`, error.message);

    if (config.nodeEnv === 'development') {
      console.log(`\x1b[36m[Database] Falling back to local in-memory MongoDB Server...\x1b[0m`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log(`\x1b[32m[Database] Local In-Memory MongoDB Connected successfully!\x1b[0m`);
        console.log(`[Database] Connection URI: ${uri}`);
      } catch (memError: any) {
        console.error(`\x1b[31m[Database] Failed to start in-memory MongoDB Server:\x1b[0m`, memError.message);
        console.warn(`\x1b[33m[Database] Running with database errors. Database models will not function.\x1b[0m`);
      }
    } else {
      console.warn(`\x1b[33m[Database] Running with database errors. Database models will not function.\x1b[0m`);
      if (config.nodeEnv === 'production') {
        process.exit(1);
      }
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      console.log('[Database] Local In-Memory MongoDB stopped.');
    }
  } catch (error: any) {
    console.error('[Database] Error during database disconnect:', error.message);
  }
};
