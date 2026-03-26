import path from 'path';

const DEFAULT_PORT = process.env.PORT || 3000;

export const config = {
  manager: {
    port: DEFAULT_PORT,
    workerUrls: [
      `http://worker1:${DEFAULT_PORT}`,
      `http://worker2:${DEFAULT_PORT}`,
      `http://worker3:${DEFAULT_PORT}`,
    ],
    maxCacheSize: 100,
    timeout: 10_000,
  },
  worker: {
    port: DEFAULT_PORT,
    managerUrl: `http://manager:${DEFAULT_PORT}`,
    scriptPath: path.join(__dirname, './worker/resolve-hash.js')
  }
};
