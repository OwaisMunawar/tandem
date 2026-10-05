import { loadConfig } from './config';
import { startTandemServer } from './server';

const config = loadConfig();

const server = await startTandemServer({
  port: config.port,
  host: config.host,
  dataDir: config.dataDir,
  // A plain model id goes through the AI Gateway, so any provider works
  // with nothing more than QUICK_ADD_MODEL and AI_GATEWAY_API_KEY.
  model: config.quickAddModel || null,
  quickAddRateLimit: config.quickAddRateLimit,
  onError: (error) => console.warn('[sync]', error instanceof Error ? error.message : error),
});

console.log(`Tandem sync server listening on ${server.url} (data: ${config.dataDir})`);
console.log(
  config.quickAddModel
    ? `LLM quick add enabled with ${config.quickAddModel}`
    : 'LLM quick add disabled (set QUICK_ADD_MODEL to enable)',
);

const shutdown = async () => {
  await server.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
