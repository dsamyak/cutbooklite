import { Router } from 'express';
import { getEarningsDashboard } from '../controllers/earnings.controller';
import { authenticate, requireRole, requireSubscription } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));
router.use(requireSubscription);

router.get('/', getEarningsDashboard);

export default router;
