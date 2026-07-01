import { FavoriteSourceType } from '@prisma/client';
import { favoritesRepository, CreateFavoriteData, UpdateFavoriteData, ListFavoritesParams } from './favorites.repository';
import { ConflictError, NotFoundError } from '../../errors/AppError';

export async function createFavorite(data: CreateFavoriteData) {
  const existing = await favoritesRepository.findBySource(data.sourceType, data.sourceId);
  if (existing) {
    throw new ConflictError('FAVORITE_ALREADY_EXISTS', 'A favorite with this sourceType and sourceId already exists');
  }
  return favoritesRepository.create(data);
}

export async function getFavorite(id: string) {
  const favorite = await favoritesRepository.findById(id);
  if (!favorite) {
    throw new NotFoundError('FAVORITE_NOT_FOUND', `Favorite with id ${id} not found`);
  }
  return favorite;
}

export async function listFavorites(params: ListFavoritesParams) {
  return favoritesRepository.list(params);
}

export async function updateFavorite(id: string, data: UpdateFavoriteData) {
  const existing = await favoritesRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('FAVORITE_NOT_FOUND', `Favorite with id ${id} not found`);
  }
  return favoritesRepository.update(id, data);
}

export async function deleteFavorite(id: string) {
  const existing = await favoritesRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('FAVORITE_NOT_FOUND', `Favorite with id ${id} not found`);
  }
  return favoritesRepository.delete(id);
}
