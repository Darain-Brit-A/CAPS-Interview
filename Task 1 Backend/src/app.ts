import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import apodRoutes from './modules/apod/apod.routes';
import marsRoverRoutes from './modules/mars-rover/marsRover.routes';
import neoRoutes from './modules/neo/neo.routes';
import favoritesRoutes from './modules/favorites/favorites.routes';
import { getPrismaClient } from './db/client';
import { logger } from './config/logger';

export function createApp(): express.Express {
  const app = express();

  // CORS
  const corsOrigins = env.CORS_ALLOWED_ORIGINS === '*' ? true : env.CORS_ALLOWED_ORIGINS.split(',');
  app.use(cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Request ID
  app.use(requestIdMiddleware);

  // Rate limiting
  if (env.NODE_ENV !== 'test') {
    app.use(apiLimiter);
  }

  // Health check
  app.get(`${env.API_BASE_PATH}/health`, async (_req, res) => {
    try {
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error({ err }, 'Health check failed');
      res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
    }
  });

  // Routes
  app.use(`${env.API_BASE_PATH}/apod`, apodRoutes);
  app.use(`${env.API_BASE_PATH}/mars-rover`, marsRoverRoutes);
  app.use(`${env.API_BASE_PATH}/neo`, neoRoutes);
  app.use(`${env.API_BASE_PATH}/favorites`, favoritesRoutes);

  // 404
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}
