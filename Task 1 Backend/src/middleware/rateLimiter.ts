import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../cache/redisClient';
import { env } from '../config/env';

function createRedisStore(prefix: string) {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<string>,
    prefix: `ratelimit:${prefix}:`,
  });
}

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        requestId: _req.requestId || 'unknown',
      },
    });
  },
});

export const writeLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('write'),
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many write requests, please try again later',
        requestId: _req.requestId || 'unknown',
      },
    });
  },
});
