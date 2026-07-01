import cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { runApodJob, checkBackfill } from '../modules/apod/apod.job';

let scheduledTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  if (!env.APOD_JOB_ENABLED) {
    logger.info('APOD job disabled via APOD_JOB_ENABLED=false');
    return;
  }

  logger.info({ cron: env.APOD_JOB_CRON }, 'Starting APOD cron scheduler');

  scheduledTask = cron.schedule(env.APOD_JOB_CRON, async () => {
    logger.info('APOD cron triggered');
    try {
      await runApodJob();
    } catch (err) {
      logger.error({ err }, 'APOD cron job failed');
    }
  });

  logger.info('APOD cron scheduler started');
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('APOD cron scheduler stopped');
  }
}

export async function bootBackfillCheck(): Promise<void> {
  if (!env.APOD_JOB_BACKFILL_ON_BOOT) return;
  try {
    await checkBackfill();
  } catch (err) {
    logger.error({ err }, 'Boot backfill check failed');
  }
}
