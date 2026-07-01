import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_PATH: z.string().default('/api/v1'),

  NASA_API_KEY: z.string().min(1, 'NASA_API_KEY is required'),
  NASA_API_BASE_URL: z.string().url().default('https://api.nasa.gov'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().default('redis://localhost:6379'),
  CACHE_DRIVER: z.enum(['redis', 'memory']).default('redis'),

  CACHE_TTL_APOD: z.coerce.number().int().positive().default(86400),
  CACHE_TTL_MARS_ROVER: z.coerce.number().int().positive().default(3600),
  CACHE_TTL_NEO: z.coerce.number().int().positive().default(3600),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),

  APOD_JOB_CRON: z.string().default('0 6 * * *'),
  APOD_JOB_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  APOD_JOB_BACKFILL_ON_BOOT: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CORS_ALLOWED_ORIGINS: z.string().default('*'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadConfig();
