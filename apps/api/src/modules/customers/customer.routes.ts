import { Router } from 'express';
import { authenticate, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@cutbooklite/shared';
import * as handler from './customer.handler';

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', handler.listCustomers);
router.post('/', validate(CreateCustomerSchema), handler.createCustomer);
router.get('/:id', handler.getCustomer);
router.patch('/:id', validate(UpdateCustomerSchema), handler.updateCustomer);
router.get('/:id/history', handler.getCustomerHistory);
router.get('/:id/loyalty', handler.getCustomerLoyalty);

export default router;
