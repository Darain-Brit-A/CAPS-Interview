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
import { mockMarsRoverPhotos, mockMarsRoverEmpty } from '../fixtures/nasaResponses';

const mockGet = getNasaHttpClient as jest.MockedFunction<typeof getNasaHttpClient>;

describe('Mars Rover API Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch photos for a valid rover + sol', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockMarsRoverPhotos }),
    } as any);

    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', sol: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].camera.code).toBe('FHAZ');
    expect(res.body.data[0].rover.name).toBe('curiosity');
    expect(res.body.meta.source).toBe('nasa_mars_rover_v1');
  });

  it('should return 200 with empty data for zero photos', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockMarsRoverEmpty }),
    } as any);

    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', sol: 999999 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.count).toBe(0);
  });

  it('should reject both sol and earth_date', async () => {
    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', sol: 1000, earth_date: '2015-05-30' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject when neither sol nor earth_date provided', async () => {
    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should reject invalid camera for rover', async () => {
    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', sol: 100, camera: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should accept valid camera for rover', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockMarsRoverPhotos }),
    } as any);

    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', sol: 100, camera: 'FHAZ' });

    expect(res.status).toBe(200);
  });

  it('should reject future earth_date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const dateStr = futureDate.toISOString().split('T')[0];

    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'curiosity', earth_date: dateStr });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should normalize camera and rover names', async () => {
    mockGet.mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: mockMarsRoverPhotos }),
    } as any);

    const res = await request(app)
      .get('/api/v1/mars-rover/photos')
      .query({ rover: 'CURIOSITY', sol: 1000, camera: 'fhaz' });

    expect(res.status).toBe(200);
    expect(res.body.data[0].rover.name).toBe('curiosity');
    expect(res.body.data[0].camera.code).toBe('FHAZ');
  });
});
