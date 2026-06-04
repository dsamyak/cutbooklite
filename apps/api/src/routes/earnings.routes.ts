import { Router } from 'express';
import { getEarningsDashboard } from '../controllers/earnings.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

router.get('/', getEarningsDashboard);

export default router;
