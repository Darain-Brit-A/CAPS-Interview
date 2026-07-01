import express from 'express';
import request from 'supertest';

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.NASA_API_KEY = 'test-key';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/space_explorer_test';
process.env.CACHE_DRIVER = 'memory';
process.env.APOD_JOB_BACKFILL_ON_BOOT = 'false';

// Mock Prisma client
const mockPrisma = {
  favorite: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../src/db/client', () => ({
  getPrismaClient: () => mockPrisma,
}));

import { createTestApp } from '../helpers/testApp';

describe('Favorites API Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFavorite = {
    id: 'test-uuid-123',
    sourceType: 'APOD',
    sourceId: '2026-06-30',
    title: 'Test APOD',
    payload: { date: '2026-06-30', title: 'Test APOD' },
    notes: 'My notes',
    tags: ['space', 'stars'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should create a favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(null);
    mockPrisma.favorite.create.mockResolvedValue(mockFavorite);

    const res = await request(app)
      .post('/api/v1/favorites')
      .send({
        sourceType: 'APOD',
        sourceId: '2026-06-30',
        title: 'Test APOD',
        payload: { date: '2026-06-30', title: 'Test APOD' },
        notes: 'My notes',
        tags: ['space', 'stars'],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('test-uuid-123');
    expect(res.body.sourceType).toBe('APOD');
  });

  it('should return 409 for duplicate favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);

    const res = await request(app)
      .post('/api/v1/favorites')
      .send({
        sourceType: 'APOD',
        sourceId: '2026-06-30',
        title: 'Test APOD',
        payload: { date: '2026-06-30', title: 'Test APOD' },
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FAVORITE_ALREADY_EXISTS');
  });

  it('should list favorites with pagination', async () => {
    mockPrisma.favorite.findMany.mockResolvedValue([mockFavorite]);
    mockPrisma.favorite.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/v1/favorites')
      .query({ page: 1, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.totalCount).toBe(1);
    expect(res.body.meta.page).toBe(1);
  });

  it('should get a single favorite by id', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);

    const res = await request(app)
      .get('/api/v1/favorites/test-uuid-123');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('test-uuid-123');
  });

  it('should return 404 for non-existent favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/favorites/non-existent');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FAVORITE_NOT_FOUND');
  });

  it('should update notes and tags', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);
    mockPrisma.favorite.update.mockResolvedValue({
      ...mockFavorite,
      notes: 'Updated notes',
      tags: ['new-tag'],
    });

    const res = await request(app)
      .patch('/api/v1/favorites/test-uuid-123')
      .send({ notes: 'Updated notes', tags: ['new-tag'] });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Updated notes');
    expect(res.body.tags).toEqual(['new-tag']);
  });

  it('should return 400 for empty update payload', async () => {
    const res = await request(app)
      .patch('/api/v1/favorites/test-uuid-123')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should delete a favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(mockFavorite);
    mockPrisma.favorite.delete.mockResolvedValue(mockFavorite);

    const res = await request(app)
      .delete('/api/v1/favorites/test-uuid-123');

    expect(res.status).toBe(204);
  });

  it('should return 404 when deleting non-existent favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/favorites/non-existent');

    expect(res.status).toBe(404);
  });
});
