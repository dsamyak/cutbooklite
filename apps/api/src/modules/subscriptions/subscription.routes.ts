import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UpgradeSubscriptionSchema } from '@cutbooklite/shared';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);
const sid = (req: Request) => req.user!.salonId!;

router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { pricePaiseMonthly: 'asc' } });
    res.json(success(plans));
  } catch (e) { next(e); }
});

router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { salonId: sid(req) },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(success(sub));
  } catch (e) { next(e); }
});

router.post('/upgrade', authorize('owner'), validate(UpgradeSubscriptionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) { res.status(404).json(failure('NOT_FOUND', 'Plan not found')); return; }
    
    // In production: Create Razorpay subscription link here and return it
    // For demo: Just update it
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    
    const sub = await prisma.subscription.create({
      data: { salonId: sid(req), planId, status: 'active', currentPeriodEnd: periodEnd },
      include: { plan: true },
    });
    await prisma.salon.update({ where: { id: sid(req) }, data: { subscriptionId: sub.id } });
    
    res.json(success(sub));
  } catch (e) { next(e); }
});

export default router;
