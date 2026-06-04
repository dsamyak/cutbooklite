import { Router } from 'express';
import { registerOwner, login, inviteBarber, acceptInvite } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/register', registerOwner);
router.post('/login', login);
router.post('/invite-barber', authenticate, requireRole('OWNER'), inviteBarber);
router.post('/accept-invite', acceptInvite);

export default router;
