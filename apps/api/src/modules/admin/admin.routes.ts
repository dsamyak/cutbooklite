import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

const router = Router();
router.use(authenticate, authorize('super_admin'));

router.get('/salons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const salons = await prisma.salon.findMany({
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true, branches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(success(salons));
  } catch (e) { next(e); }
});

router.patch('/salons/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body; // 'active', 'suspended'
    const salon = await prisma.salon.update({
      where: { id: req.params.id },
      data: { status },
    });
    // Log audit
    await prisma.auditLog.create({
      data: {
        salonId: salon.id,
        actorUserId: req.user!.userId,
        action: 'salon.status.changed',
        metadata: { newStatus: status },
      },
    });
    res.json(success(salon));
  } catch (e) { next(e); }
});

router.get('/platform-metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalSalons, activeSubscriptions, mrr] = await prisma.$transaction([
      prisma.salon.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.aggregate({ where: { status: 'active' }, _sum: { plan: { select: { pricePaiseMonthly: true } } } }),
    ]);
    res.json(success({
      totalSalons,
      activeSubscriptions,
      mrrPaise: mrr._sum.pricePaiseMonthly || 0,
    }));
  } catch (e) { next(e); }
});

export default router;
