import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { success } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant, authorize('owner'));
const sid = (req: Request) => req.user!.salonId!;

router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Scaffold for advanced analytics: e.g. M-o-M growth, churn rate
    // We'll keep it simple for MVP
    const customers = await prisma.customer.count({ where: { salonId: sid(req) } });
    const invoices = await prisma.invoice.count({ where: { salonId: sid(req), status: 'paid' } });
    res.json(success({ customers, completedServices: invoices, message: 'More advanced analytics coming soon' }));
  } catch (e) { next(e); }
});

router.get('/peak-hours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoices = await prisma.invoice.findMany({ where: { salonId: sid(req), status: 'paid' }, select: { createdAt: true } });
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    for (const inv of invoices) {
      hours[inv.createdAt.getHours()]++;
    }
    res.json(success(Object.entries(hours).map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))));
  } catch (e) { next(e); }
});

export default router;
