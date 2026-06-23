import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { success } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant, authorize('owner'));
const sid = (req: Request) => req.user!.salonId!;

router.get('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { period, barberId } = req.query; // period like "2026-06"
    const where: any = {};
    if (period) where.period = period;
    const barbers = barberId
      ? await prisma.barber.findMany({ where: { id: barberId as string, salonId: sid(req) }, include: { user: true } })
      : await prisma.barber.findMany({ where: { salonId: sid(req) }, include: { user: true } });

    const report = await Promise.all(barbers.map(async (b) => {
      const entries = await prisma.commissionEntry.findMany({ where: { barberId: b.id, ...where } });
      const total = entries.reduce((acc, e) => acc + Number(e.commissionAmountPaise), 0);
      return { barber: { id: b.id, name: b.user.name }, period: period || 'all', totalCommissionPaise: total, entries: entries.length };
    }));

    res.json(success(report));
  } catch (e) { next(e); }
});

export default router;
