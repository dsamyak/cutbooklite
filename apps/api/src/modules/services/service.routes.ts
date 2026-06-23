import { Router } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateServiceSchema, UpdateServiceSchema, CreateServiceCategorySchema } from '@cutbooklite/shared';
import * as handler from './service.handler';

const router = Router();
router.use(authenticate, requireTenant);

router.get('/categories', handler.listCategories);
router.post('/categories', authorize('owner'), validate(CreateServiceCategorySchema), handler.createCategory);
router.get('/', handler.listServices);
router.post('/', authorize('owner'), validate(CreateServiceSchema), handler.createService);
router.get('/:id', handler.getService);
router.patch('/:id', authorize('owner'), validate(UpdateServiceSchema), handler.updateService);

export default router;
