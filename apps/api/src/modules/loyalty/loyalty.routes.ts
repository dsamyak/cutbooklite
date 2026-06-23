import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { RedeemLoyaltySchema } from '@cutbooklite/shared';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);
const sid = (req: Request) => req.user!.salonId!;

router.get('/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { salonId: sid(req), loyaltyPoints: { gt: 0 } },
      orderBy: { loyaltyPoints: 'desc' },
      take: 20,
      select: { id: true, name: true, mobile: true, loyaltyPoints: true, totalSpendPaise: true },
    });
    res.json(success(customers));
  } catch (e) { next(e); }
});

router.post('/redeem', validate(RedeemLoyaltySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, points, invoiceId } = req.body;
    const customer = await prisma.customer.findFirst({ where: { id: customerId, salonId: sid(req) } });
    if (!customer) throw new AppError('NOT_FOUND', 'Customer not found', 404);
    if (customer.loyaltyPoints < points) throw new AppError('INSUFFICIENT_POINTS', 'Not enough loyalty points', 400);
    await prisma.$transaction([
      prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: points } } }),
      prisma.loyaltyTransaction.create({ data: { customerId, invoiceId, points: -points, reason: 'redeem' } }),
    ]);
    res.json(success({ message: 'Points redeemed', discountPaise: points * 100 }));
  } catch (e) { next(e); }
});

export default router;
