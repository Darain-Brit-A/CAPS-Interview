import { z } from 'zod';

const sourceTypeEnum = z.enum(['APOD', 'MARS_ROVER_PHOTO', 'NEO']);

export const createFavoriteSchema = z.object({
  sourceType: sourceTypeEnum,
  sourceId: z.string().min(1),
  title: z.string().min(1),
  payload: z.record(z.unknown()),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateFavoriteSchema = z
  .object({
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.notes !== undefined || data.tags !== undefined,
    { message: 'At least one of notes or tags is required' }
  );

export const listFavoritesSchema = z.object({
  sourceType: sourceTypeEnum.optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
