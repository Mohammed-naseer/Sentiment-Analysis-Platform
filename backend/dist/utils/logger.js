"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message, ...args) => {
        console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`\x1b[33m[WARN] [${new Date().toISOString()}] ${message}\x1b[0m`, ...args);
    },
    error: (message, ...args) => {
        console.error(`\x1b[31m[ERROR] [${new Date().toISOString()}] ${message}\x1b[0m`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
        }
    }
};
exports.default = exports.logger;
