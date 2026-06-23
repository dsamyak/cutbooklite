import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { success } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant, authorize('owner'));
const sid = (req: Request) => req.user!.salonId!;

router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const where: any = { salonId: sid(req), status: 'paid', deletedAt: null };
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from as string); if (to) where.createdAt.lte = new Date(to as string); }
    const invoices = await prisma.invoice.findMany({ where, include: { payments: true } });
    
    // Group by day
    const daily: Record<string, number> = {};
    for (const inv of invoices) {
      const day = inv.createdAt.toISOString().split('T')[0];
      daily[day] = (daily[day] || 0) + Number(inv.totalPaise);
    }
    res.json(success(Object.entries(daily).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date))));
  } catch (e) { next(e); }
});

router.get('/staff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const where: any = { salonId: sid(req), status: 'paid', deletedAt: null };
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from as string); if (to) where.createdAt.lte = new Date(to as string); }
    
    const invoices = await prisma.invoice.findMany({ where, include: { items: { include: { barber: { include: { user: true } } } } } });
    const staffData: Record<string, { name: string; servicesCompleted: number; revenueGenerated: number }> = {};
    
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (!staffData[item.barberId]) staffData[item.barberId] = { name: item.barber.user.name, servicesCompleted: 0, revenueGenerated: 0 };
        staffData[item.barberId].servicesCompleted += item.quantity;
        staffData[item.barberId].revenueGenerated += Number(item.unitPricePaise) * item.quantity;
      }
    }
    res.json(success(Object.values(staffData).sort((a, b) => b.revenueGenerated - a.revenueGenerated)));
  } catch (e) { next(e); }
});

router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { salonId: sid(req) },
      orderBy: { totalSpendPaise: 'desc' },
      take: 50,
      select: { id: true, name: true, mobile: true, totalSpendPaise: true, createdAt: true },
    });
    res.json(success(customers));
  } catch (e) { next(e); }
});

export default router;
