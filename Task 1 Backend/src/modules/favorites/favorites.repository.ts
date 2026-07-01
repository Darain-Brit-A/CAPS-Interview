import { getPrismaClient } from '../../db/client';

export interface CreateFavoriteData {
  sourceType: string;
  sourceId: string;
  title: string;
  payload: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

export interface UpdateFavoriteData {
  notes?: string;
  tags?: string[];
}

export interface ListFavoritesParams {
  sourceType?: string;
  tag?: string;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const favoritesRepository = {
  async create(data: CreateFavoriteData) {
    const prisma = getPrismaClient();
    return prisma.favorite.create({
      data: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        title: data.title,
        payload: JSON.stringify(data.payload),
        notes: data.notes,
        tags: JSON.stringify(data.tags || []),
      },
    });
  },

  async findById(id: string) {
    const prisma = getPrismaClient();
    const fav = await prisma.favorite.findUnique({ where: { id } });
    if (fav) {
      return {
        ...fav,
        payload: JSON.parse(fav.payload as string),
        tags: JSON.parse(fav.tags as string),
      };
    }
    return null;
  },

  async findBySource(sourceType: string, sourceId: string) {
    const prisma = getPrismaClient();
    return prisma.favorite.findUnique({
      where: { sourceType_sourceId: { sourceType, sourceId } },
    });
  },

  async list(params: ListFavoritesParams) {
    const prisma = getPrismaClient();
    const { sourceType, tag, search, page, pageSize, sortBy, sortOrder } = params;

    const where: Record<string, unknown> = {};
    if (sourceType) where.sourceType = sourceType;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [rawData, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.favorite.count({ where }),
    ]);

    // Parse JSON fields and filter by tag in-memory (SQLite doesn't support array contains)
    let data = rawData.map((fav) => ({
      ...fav,
      payload: JSON.parse(fav.payload as string),
      tags: JSON.parse(fav.tags as string),
    }));

    if (tag) {
      data = data.filter((fav) => fav.tags.includes(tag));
    }

    return {
      data,
      meta: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  },

  async update(id: string, data: UpdateFavoriteData) {
    const prisma = getPrismaClient();
    const updateData: Record<string, unknown> = {};
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);

    const fav = await prisma.favorite.update({
      where: { id },
      data: updateData,
    });

    return {
      ...fav,
      payload: JSON.parse(fav.payload as string),
      tags: JSON.parse(fav.tags as string),
    };
  },

  async delete(id: string) {
    const prisma = getPrismaClient();
    return prisma.favorite.delete({ where: { id } });
  },
};
