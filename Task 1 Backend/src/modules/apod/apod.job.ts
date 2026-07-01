import { getPrismaClient } from '../../db/client';
import { getNasaHttpClient } from '../../integrations/nasa/nasaHttpClient';
import { NasaApodResponse } from '../../integrations/nasa/types';
import { cacheWrap, buildCacheKey } from '../../cache/cacheService';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

export async function runApodJob(): Promise<void> {
  const prisma = getPrismaClient();
  const today = new Date().toISOString().split('T')[0];

  // Check for existing run
  const existing = await prisma.jobRun.findUnique({
    where: { jobName_targetDate: { jobName: 'apod-daily-fetch', targetDate: today } },
  });

  if (existing) {
    if (existing.status === 'SUCCEEDED') {
      logger.info({ date: today }, 'APOD job already succeeded for today, skipping');
      return;
    }

    if (existing.status === 'RUNNING') {
      const elapsed = Date.now() - existing.startedAt.getTime();
      if (elapsed < STALE_THRESHOLD_MS) {
        logger.info({ date: today, elapsed }, 'APOD job already running, skipping');
        return;
      }
      // Mark orphaned run as failed
      await prisma.jobRun.update({
        where: { id: existing.id },
        data: {
          status: 'FAILED',
          errorMessage: 'orphaned - assumed crashed',
          finishedAt: new Date(),
        },
      });
      logger.warn({ date: today }, 'Marked orphaned APOD job as failed');
    }
  }

  // Create new run
  const run = await prisma.jobRun.create({
    data: {
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'RUNNING',
    },
  });

  try {
    const client = getNasaHttpClient();
    const response = await client.get<NasaApodResponse>('/planetary/apod', {
      params: { date: today },
    });
    const raw = response.data;

    // Upsert into ApodDaily
    await prisma.apodDaily.upsert({
      where: { date: today },
      update: {
        title: raw.title,
        explanation: raw.explanation,
        mediaType: raw.media_type,
        url: raw.url,
        hdurl: raw.hdurl || null,
        copyright: raw.copyright || null,
        fetchedAt: new Date(),
      },
      create: {
        date: today,
        title: raw.title,
        explanation: raw.explanation,
        mediaType: raw.media_type,
        url: raw.url,
        hdurl: raw.hdurl || null,
        copyright: raw.copyright || null,
      },
    });

    // Write through to cache
    const cacheKey = buildCacheKey('apod', `date=${today}`);
    await cacheWrap(cacheKey, env.CACHE_TTL_APOD, async () => raw);

    // Mark success
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
      },
    });

    logger.info({ date: today }, 'APOD job completed successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage,
      },
    });
    logger.error({ err, date: today }, 'APOD job failed');
  }
}

export async function checkBackfill(): Promise<void> {
  if (!env.APOD_JOB_BACKFILL_ON_BOOT) return;

  const prisma = getPrismaClient();
  const today = new Date().toISOString().split('T')[0];

  const succeeded = await prisma.jobRun.findUnique({
    where: { jobName_targetDate: { jobName: 'apod-daily-fetch', targetDate: today } },
  });

  if (!succeeded || succeeded.status !== 'SUCCEEDED') {
    logger.info({ date: today }, 'No succeeded APOD job for today, triggering backfill');
    await runApodJob();
  }
}
