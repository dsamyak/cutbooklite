import { Router } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateStaffSchema, UpdateStaffSchema } from '@cutbooklite/shared';
import * as handler from './staff.handler';

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', handler.listStaff);
router.post('/', authorize('owner'), validate(CreateStaffSchema), handler.createStaff);
router.get('/:id', handler.getStaff);
router.patch('/:id', authorize('owner'), validate(UpdateStaffSchema), handler.updateStaff);
router.delete('/:id', authorize('owner'), handler.deactivateStaff);
router.post('/:id/services', authorize('owner'), handler.assignServices);

export default router;
