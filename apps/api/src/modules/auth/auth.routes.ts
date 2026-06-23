import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as handler from './auth.handler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  LoginSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  RegisterSchema,
} from '@cutbooklite/shared';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, data: null, error: { code: 'RATE_LIMITED', message: 'Too many attempts' } },
});

router.post('/register', validate(RegisterSchema), handler.register);
router.post('/login', authLimiter, validate(LoginSchema), handler.login);
router.post('/otp/request', authLimiter, validate(OtpRequestSchema), handler.requestOtp);
router.post('/otp/verify', authLimiter, validate(OtpVerifySchema), handler.verifyOtp);
router.post('/refresh', handler.refresh);
router.post('/logout', authenticate, handler.logout);
router.post('/logout-all', authenticate, handler.logoutAll);
router.get('/me', authenticate, handler.getMe);

export default router;
