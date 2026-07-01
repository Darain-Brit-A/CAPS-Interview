import { env } from './config/env';
import { logger } from './config/logger';
import { createApp } from './app';
import { getPrismaClient, disconnectPrisma } from './db/client';
import { connectRedis, disconnectRedis } from './cache/redisClient';
import { startScheduler, stopScheduler, bootBackfillCheck } from './jobs/scheduler';

async function main(): Promise<void> {
  logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT }, 'Starting Space Explorer API');

  // Connect to database
  const prisma = getPrismaClient();
  await prisma.$connect();
  logger.info('Database connected');

  // Connect to Redis
  await connectRedis();

  // Create Express app
  const app = createApp();

  // Start server
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `Server running on port ${env.PORT}`);
  });

  // Start background jobs
  startScheduler();

  // Boot backfill check
  await bootBackfillCheck();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    stopScheduler();
    server.close();
    await disconnectRedis();
    await disconnectPrisma();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
