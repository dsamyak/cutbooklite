import { Router } from 'express';
import { getSubscriptionStatus } from '../controllers/subscription.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));

// No subscription gate here — lapsed owners must still be able to CHECK their status
router.get('/', getSubscriptionStatus);

export default router;
