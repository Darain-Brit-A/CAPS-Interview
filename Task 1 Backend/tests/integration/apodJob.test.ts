// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.NASA_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/space_explorer_test';
process.env.CACHE_DRIVER = 'memory';
process.env.APOD_JOB_BACKFILL_ON_BOOT = 'false';

import { runApodJob } from '../../src/modules/apod/apod.job';

// Mock Prisma client
const mockPrisma = {
  jobRun: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  apodDaily: {
    upsert: jest.fn(),
  },
};

jest.mock('../../src/db/client', () => ({
  getPrismaClient: () => mockPrisma,
}));

// Mock NASA HTTP client
jest.mock('../../src/integrations/nasa/nasaHttpClient', () => ({
  getNasaHttpClient: jest.fn(),
}));

// Mock cache service
jest.mock('../../src/cache/cacheService', () => ({
  cacheWrap: jest.fn(),
  buildCacheKey: jest.fn((...parts: string[]) => 'nasa:' + parts.join(':')),
}));

import { getNasaHttpClient } from '../../src/integrations/nasa/nasaHttpClient';
import { cacheWrap } from '../../src/cache/cacheService';

const mockGet = getNasaHttpClient as jest.MockedFunction<typeof getNasaHttpClient>;

describe('APOD Background Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should run successfully and create job run record', async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockApodData = {
      date: today,
      title: 'Test APOD',
      explanation: 'Test explanation',
      media_type: 'image',
      url: 'https://example.com/image.jpg',
    };

    mockPrisma.jobRun.findUnique.mockResolvedValue(null);
    mockPrisma.jobRun.create.mockResolvedValue({
      id: 'run-123',
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockApodData }),
    } as any);

    (cacheWrap as jest.Mock).mockResolvedValue({ value: mockApodData, cached: false });

    await runApodJob();

    expect(mockPrisma.jobRun.create).toHaveBeenCalledWith({
      data: {
        jobName: 'apod-daily-fetch',
        targetDate: today,
        status: 'RUNNING',
      },
    });

    expect(mockPrisma.apodDaily.upsert).toHaveBeenCalled();

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'run-123' },
      data: {
        status: 'SUCCEEDED',
        finishedAt: expect.any(Date),
      },
    });
  });

  it('should skip if already succeeded for today', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockPrisma.jobRun.findUnique.mockResolvedValue({
      id: 'run-existing',
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'SUCCEEDED',
      startedAt: new Date(),
    });

    await runApodJob();

    expect(mockPrisma.jobRun.create).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should handle stale RUNNING job by marking it as failed', async () => {
    const today = new Date().toISOString().split('T')[0];
    const oldDate = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

    mockPrisma.jobRun.findUnique.mockResolvedValue({
      id: 'run-stale',
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'RUNNING',
      startedAt: oldDate,
    });

    // New run
    mockPrisma.jobRun.create.mockResolvedValue({
      id: 'run-new',
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: {
          date: today,
          title: 'Test',
          explanation: 'Test',
          media_type: 'image',
          url: 'https://example.com/image.jpg',
        },
      }),
    } as any);

    (cacheWrap as jest.Mock).mockResolvedValue({ value: {}, cached: false });

    await runApodJob();

    // Should mark orphaned run as failed
    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'run-stale' },
      data: {
        status: 'FAILED',
        errorMessage: 'orphaned - assumed crashed',
        finishedAt: expect.any(Date),
      },
    });
  });

  it('should handle NASA API failure gracefully', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockPrisma.jobRun.findUnique.mockResolvedValue(null);
    mockPrisma.jobRun.create.mockResolvedValue({
      id: 'run-fail',
      jobName: 'apod-daily-fetch',
      targetDate: today,
      status: 'RUNNING',
      startedAt: new Date(),
    });

    mockGet.mockReturnValue({
      get: jest.fn().mockRejectedValue(new Error('Network error')),
    } as any);

    await runApodJob();

    expect(mockPrisma.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'run-fail' },
      data: {
        status: 'FAILED',
        finishedAt: expect.any(Date),
        errorMessage: 'Network error',
      },
    });
  });
});
