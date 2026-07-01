import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (env.CACHE_DRIVER !== 'redis') return null;

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      logger.warn({ err }, 'Redis connection error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  return redisClient;
}

export async function connectRedis(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.connect();
    await client.ping();
    return true;
  } catch (err) {
    logger.warn({ err }, 'Redis not available, caching disabled');
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
