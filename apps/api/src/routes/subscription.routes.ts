import { Router } from 'express';
import { getSubscriptionStatus } from '../controllers/subscription.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

router.get('/', getSubscriptionStatus);

export default router;
