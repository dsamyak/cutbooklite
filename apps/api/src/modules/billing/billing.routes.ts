import { Router } from 'express';
import { authenticate, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateWalkInSchema, CreateInvoiceSchema, CapturePaymentSchema } from '@cutbooklite/shared';
import * as handler from './billing.handler';

const router = Router();
router.use(authenticate, requireTenant);

router.post('/walk-ins', validate(CreateWalkInSchema), handler.createWalkIn);
router.post('/invoices', validate(CreateInvoiceSchema), handler.createInvoice);
router.get('/invoices', handler.listInvoices);
router.get('/invoices/:id', handler.getInvoice);
router.post('/payments/capture', validate(CapturePaymentSchema), handler.capturePayment);
router.post('/webhooks/razorpay', handler.razorpayWebhook);

export default router;
