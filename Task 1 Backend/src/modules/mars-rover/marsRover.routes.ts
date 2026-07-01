import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { marsRoverQuerySchema } from './marsRover.schema';
import { marsRoverController } from './marsRover.controller';

const router = Router();

router.get('/photos', validate(marsRoverQuerySchema, 'query'), marsRoverController);

export default router;
