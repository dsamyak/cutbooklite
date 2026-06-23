import { Router } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import * as handler from './salon.handler';
import { validate } from '../../middleware/validate';
import { UpdateSalonSchema, CreateBranchSchema } from '@cutbooklite/shared';

const router = Router();

router.use(authenticate);

// Salon profile
router.get('/:id', handler.getSalon);
router.patch('/:id', authorize('owner', 'super_admin'), validate(UpdateSalonSchema), handler.updateSalon);

// Branches
router.get('/:salonId/branches', requireTenant, handler.getBranches);
router.post('/:salonId/branches', authorize('owner'), validate(CreateBranchSchema), handler.createBranch);

export default router;
