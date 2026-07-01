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
import { mockApodSingle, mockApodVideo, mockApodRange } from '../fixtures/nasaResponses';

const mockGet = getNasaHttpClient as jest.MockedFunction<typeof getNasaHttpClient>;

describe('APOD API Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch APOD for a single date', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockApodSingle }),
    } as any);

    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: '2026-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].date).toBe('2026-06-30');
    expect(res.body.data[0].mediaType).toBe('image');
    expect(res.body.meta.source).toBe('nasa_apod_v1');
  });

  it('should handle video APOD (no hdurl)', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockApodVideo }),
    } as any);

    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: '2026-06-29' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].mediaType).toBe('video');
    expect(res.body.data[0].hdurl).toBeNull();
  });

  it('should fetch APOD range', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockApodRange }),
    } as any);

    const res = await request(app)
      .get('/api/v1/apod')
      .query({ start_date: '2026-06-29', end_date: '2026-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.count).toBe(2);
  });

  it('should reject future date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];

    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: dateStr });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject date before 1995-06-16', async () => {
    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: '1990-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject both date and start_date', async () => {
    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: '2026-06-30', start_date: '2026-06-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject start_date after end_date', async () => {
    const res = await request(app)
      .get('/api/v1/apod')
      .query({ start_date: '2026-06-07', end_date: '2026-06-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return cached response when cached=true', async () => {
    const { cacheWrap } = require('../../src/cache/cacheService');
    cacheWrap.mockResolvedValueOnce({ value: mockApodSingle, cached: true });

    const res = await request(app)
      .get('/api/v1/apod')
      .query({ date: '2026-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.meta.cached).toBe(true);
  });
});
