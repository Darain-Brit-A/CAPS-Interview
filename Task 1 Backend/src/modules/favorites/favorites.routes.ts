import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { createFavoriteSchema, updateFavoriteSchema } from './favorites.schema';
import {
  createFavoriteController,
  listFavoritesController,
  getFavoriteController,
  updateFavoriteController,
  deleteFavoriteController,
} from './favorites.controller';
import { writeLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/', writeLimiter, validate(createFavoriteSchema, 'body'), createFavoriteController);
router.get('/', listFavoritesController);
router.get('/:id', getFavoriteController);
router.patch('/:id', writeLimiter, validate(updateFavoriteSchema, 'body'), updateFavoriteController);
router.delete('/:id', writeLimiter, deleteFavoriteController);

export default router;
