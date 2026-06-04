import { Router } from 'express';
import { getMyDetails, getMyEarnings } from '../controllers/barbers.controller';
import { authenticate, requireRole, requireSubscription } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('BARBER'));

// /barbers/me — no subscription gate (barber needs to discover their salon even if lapsed)
router.get('/me', getMyDetails);

// /barbers/earnings — subscription gate applies
router.get('/earnings', requireSubscription, getMyEarnings);

export default router;
