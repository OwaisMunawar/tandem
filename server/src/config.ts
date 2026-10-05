import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8043),
  HOST: z.string().default('0.0.0.0'),
  DATA_DIR: z.string().default('./data'),
  QUICK_ADD_MODEL: z.string().trim().default(''),
  /** Requests per minute per client address for the LLM endpoint. */
  QUICK_ADD_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
});

export type ServerConfig = {
  port: number;
  host: string;
  dataDir: string;
  quickAddModel: string;
  quickAddRateLimit: number;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = envSchema.parse(env);
  return {
    port: parsed.PORT,
    host: parsed.HOST,
    dataDir: parsed.DATA_DIR,
    quickAddModel: parsed.QUICK_ADD_MODEL,
    quickAddRateLimit: parsed.QUICK_ADD_RATE_LIMIT,
  };
}
