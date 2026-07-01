import express from 'express';
import { env } from '../../src/config/env';
import { requestIdMiddleware } from '../../src/middleware/requestId';
import { errorHandler } from '../../src/middleware/errorHandler';
import { notFoundHandler } from '../../src/middleware/notFound';
import apodRoutes from '../../src/modules/apod/apod.routes';
import marsRoverRoutes from '../../src/modules/mars-rover/marsRover.routes';
import neoRoutes from '../../src/modules/neo/neo.routes';
import favoritesRoutes from '../../src/modules/favorites/favorites.routes';

export function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(`${env.API_BASE_PATH}/apod`, apodRoutes);
  app.use(`${env.API_BASE_PATH}/mars-rover`, marsRoverRoutes);
  app.use(`${env.API_BASE_PATH}/neo`, neoRoutes);
  app.use(`${env.API_BASE_PATH}/favorites`, favoritesRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
