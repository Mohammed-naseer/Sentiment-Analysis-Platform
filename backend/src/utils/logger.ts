export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`\x1b[33m[WARN] [${new Date().toISOString()}] ${message}\x1b[0m`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`\x1b[31m[ERROR] [${new Date().toISOString()}] ${message}\x1b[0m`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
    }
  }
};

export default logger;
