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
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
let mongod = null;
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(env_1.config.mongodbUri, {
            serverSelectionTimeoutMS: 5000, // 5s timeout to trigger faster fallback
        });
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    }
    catch (error) {
        console.error(`\x1b[31m[Database] Primary MongoDB connection error:\x1b[0m`, error.message);
        if (env_1.config.nodeEnv === 'development') {
            console.log(`\x1b[36m[Database] Falling back to local in-memory MongoDB Server...\x1b[0m`);
            try {
                const { MongoMemoryServer } = await Promise.resolve().then(() => __importStar(require('mongodb-memory-server')));
                mongod = await MongoMemoryServer.create();
                const uri = mongod.getUri();
                await mongoose_1.default.connect(uri);
                console.log(`\x1b[32m[Database] Local In-Memory MongoDB Connected successfully!\x1b[0m`);
                console.log(`[Database] Connection URI: ${uri}`);
            }
            catch (memError) {
                console.error(`\x1b[31m[Database] Failed to start in-memory MongoDB Server:\x1b[0m`, memError.message);
                console.warn(`\x1b[33m[Database] Running with database errors. Database models will not function.\x1b[0m`);
            }
        }
        else {
            console.warn(`\x1b[33m[Database] Running with database errors. Database models will not function.\x1b[0m`);
            if (env_1.config.nodeEnv === 'production') {
                process.exit(1);
            }
        }
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        if (mongod) {
            await mongod.stop();
            console.log('[Database] Local In-Memory MongoDB stopped.');
        }
    }
    catch (error) {
        console.error('[Database] Error during database disconnect:', error.message);
    }
};
exports.disconnectDB = disconnectDB;
