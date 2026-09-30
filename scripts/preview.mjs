import { createRequire } from 'node:module';

process.env.YJ_EMBEDDED = '1';
const require = createRequire(import.meta.url);
const { startDesktopServer } = require('../dist/server.cjs');

await startDesktopServer(8766);
