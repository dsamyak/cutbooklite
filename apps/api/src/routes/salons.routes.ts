import { Router } from 'express';
import {
  createSalon, getSalons, getSalonById, updateSalon, deleteSalon,
  getSalonBarbers, addBarberToSalon, removeBarberFromSalon
} from '../controllers/salons.controller';
import { authenticate, requireRole, requireSubscription } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole('OWNER'));
router.use(requireSubscription);

router.post('/', createSalon);
router.get('/', getSalons);
router.get('/:id', getSalonById);
router.patch('/:id', updateSalon);
router.delete('/:id', deleteSalon);

router.get('/:id/barbers', getSalonBarbers);
router.post('/:id/barbers/:barber_id', addBarberToSalon);
router.delete('/:id/barbers/:barber_id', removeBarberFromSalon);

export default router;
