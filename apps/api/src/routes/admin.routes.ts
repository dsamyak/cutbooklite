import { Router } from 'express';
import { getAllOwners, updateOwnerSubscription, deleteOwner } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/owners', getAllOwners);
router.patch('/owners/:id/subscription', updateOwnerSubscription);
router.delete('/owners/:id', deleteOwner);

export default router;
