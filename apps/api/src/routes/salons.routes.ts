import { Router } from 'express';
import { createSalon, getSalons, getSalonById, updateSalon, deleteSalon, getSalonBarbers, addBarberToSalon, removeBarberFromSalon } from '../controllers/salons.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Owner only routes
router.post('/', requireRole('OWNER'), createSalon);
router.get('/', requireRole('OWNER'), getSalons);
router.get('/:id', requireRole('OWNER'), getSalonById);
router.patch('/:id', requireRole('OWNER'), updateSalon);
router.delete('/:id', requireRole('OWNER'), deleteSalon);

// Salon Barbers management
router.get('/:id/barbers', requireRole('OWNER'), getSalonBarbers);
router.post('/:id/barbers/:barber_id', requireRole('OWNER'), addBarberToSalon);
router.delete('/:id/barbers/:barber_id', requireRole('OWNER'), removeBarberFromSalon);

export default router;
