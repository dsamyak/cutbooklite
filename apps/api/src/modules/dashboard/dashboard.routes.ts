import { Router } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import * as handler from './dashboard.handler';

const router = Router();
router.use(authenticate, requireTenant, authorize('owner', 'super_admin'));
router.get('/earnings', handler.getEarnings);
router.get('/summary', handler.getSummary);

export default router;
