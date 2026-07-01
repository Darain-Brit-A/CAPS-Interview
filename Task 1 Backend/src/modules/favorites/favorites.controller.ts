import { Request, Response, NextFunction } from 'express';
import { createFavorite, getFavorite, listFavorites, updateFavorite, deleteFavorite } from './favorites.service';
import { FavoriteSourceType } from '@prisma/client';

export async function createFavoriteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createFavorite(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listFavoritesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sourceType, tag, search, page, pageSize, sortBy, sortOrder } = req.query as {
      sourceType?: string;
      tag?: string;
      search?: string;
      page?: string;
      pageSize?: string;
      sortBy?: string;
      sortOrder?: string;
    };

    const result = await listFavorites({
      sourceType: sourceType as FavoriteSourceType | undefined,
      tag,
      search,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      sortBy: sortBy || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFavoriteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getFavorite(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateFavoriteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await updateFavorite(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function deleteFavoriteController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteFavorite(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
