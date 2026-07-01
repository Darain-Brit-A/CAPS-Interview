import { getPrismaClient } from '../db/client';
import { logger } from '../config/logger';

export async function markJobRunning(jobName: string, targetDate: string): Promise<string | null> {
  const prisma = getPrismaClient();
  try {
    const run = await prisma.jobRun.create({
      data: {
        jobName,
        targetDate,
        status: 'RUNNING',
      },
    });
    return run.id;
  } catch (err) {
    logger.warn({ jobName, targetDate, err }, 'Failed to create job run (likely duplicate)');
    return null;
  }
}

export async function markJobSucceeded(runId: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.jobRun.update({
    where: { id: runId },
    data: {
      status: 'SUCCEEDED',
      finishedAt: new Date(),
    },
  });
}

export async function markJobFailed(runId: string, errorMessage: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.jobRun.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      finishedAt: new Date(),
      errorMessage,
    },
  });
}

export async function getLastJobRuns(jobName: string, limit: number = 10) {
  const prisma = getPrismaClient();
  return prisma.jobRun.findMany({
    where: { jobName },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
