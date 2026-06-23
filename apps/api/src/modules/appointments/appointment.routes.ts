import { Router } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateAppointmentSchema, UpdateAppointmentStatusSchema } from '@cutbooklite/shared';
import * as handler from './appointment.handler';

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', handler.listAppointments);
router.post('/', validate(CreateAppointmentSchema), handler.createAppointment);
router.get('/:id', handler.getAppointment);
router.patch('/:id/status', validate(UpdateAppointmentStatusSchema), handler.updateStatus);
router.delete('/:id', authorize('owner'), handler.cancelAppointment);

export default router;
