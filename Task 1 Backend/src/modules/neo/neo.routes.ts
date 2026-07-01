import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { neoQuerySchema } from './neo.schema';
import { neoController } from './neo.controller';

const router = Router();

router.get('/', validate(neoQuerySchema, 'query'), neoController);

export default router;
