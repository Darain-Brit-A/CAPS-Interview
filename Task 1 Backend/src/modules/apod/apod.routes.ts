import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { apodQuerySchema } from './apod.schema';
import { apodController } from './apod.controller';

const router = Router();

router.get('/', validate(apodQuerySchema, 'query'), apodController);

export default router;
