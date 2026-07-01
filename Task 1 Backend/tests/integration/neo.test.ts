import express from 'express';
import request from 'supertest';

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.NASA_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/space_explorer_test';
process.env.CACHE_DRIVER = 'memory';
process.env.APOD_JOB_BACKFILL_ON_BOOT = 'false';

jest.mock('../../src/integrations/nasa/nasaHttpClient', () => ({
  getNasaHttpClient: jest.fn(),
}));

jest.mock('../../src/cache/cacheService', () => ({
  cacheWrap: jest.fn((_key: string, _ttl: number, fetchFn: () => Promise<unknown>) =>
    fetchFn().then((value) => ({ value, cached: false }))
  ),
  buildCacheKey: jest.fn((...parts: string[]) => 'nasa:' + parts.join(':')),
}));

import { createTestApp } from '../helpers/testApp';
import { getNasaHttpClient } from '../../src/integrations/nasa/nasaHttpClient';
import { mockNeoFeed } from '../fixtures/nasaResponses';

const mockGet = getNasaHttpClient as jest.MockedFunction<typeof getNasaHttpClient>;

describe('NEO API Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch NEO feed', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockNeoFeed }),
    } as any);

    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-01', end_date: '2026-07-05' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.elementCount).toBe(2);
    expect(res.body.meta.source).toBe('nasa_neo_v1');
  });

  it('should filter by hazardous_only', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockNeoFeed }),
    } as any);

    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-01', end_date: '2026-07-05', hazardous_only: 'true' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].isPotentiallyHazardous).toBe(true);
    expect(res.body.meta.count).toBe(1);
  });

  it('should filter by min_diameter_km', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockNeoFeed }),
    } as any);

    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-01', end_date: '2026-07-05', min_diameter_km: 0.2 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.count).toBe(1);
  });

  it('should reject range exceeding 7 days BEFORE calling NASA', async () => {
    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-01', end_date: '2026-07-10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('should reject start_date after end_date', async () => {
    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-05', end_date: '2026-07-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should allow future dates for NEO', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockNeoFeed }),
    } as any);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];

    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: dateStr });

    expect(res.status).toBe(200);
  });

  it('should sort results by closeApproachDate ascending', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockNeoFeed }),
    } as any);

    const res = await request(app)
      .get('/api/v1/neo')
      .query({ start_date: '2026-07-01', end_date: '2026-07-05' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].closeApproachDate).toBe('2026-07-01');
    expect(res.body.data[1].closeApproachDate).toBe('2026-07-02');
  });
});
