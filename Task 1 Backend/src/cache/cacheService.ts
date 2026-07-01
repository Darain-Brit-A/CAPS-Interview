import { getRedisClient } from './redisClient';
import { logger } from '../config/logger';

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
  const client = getRedisClient();

  if (!client) {
    try {
      const value = await fetchFn();
      return { value, cached: false };
    } catch (err) {
      throw err;
    }
  }

  try {
    const cached = await client.get(key);
    if (cached !== null) {
      logger.debug({ key }, 'Cache hit');
      return { value: JSON.parse(cached) as T, cached: true };
    }
  } catch (err) {
    logger.warn({ err, key }, 'Redis read failed, falling through to fetchFn');
    try {
      const value = await fetchFn();
      return { value, cached: false };
    } catch (fetchErr) {
      throw fetchErr;
    }
  }

  const value = await fetchFn();

  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    logger.debug({ key, ttl: ttlSeconds }, 'Cache set');
  } catch (err) {
    logger.warn({ err, key }, 'Redis write failed');
  }

  return { value, cached: false };
}

export function buildCacheKey(...parts: string[]): string {
  return 'nasa:' + parts.join(':');
}
