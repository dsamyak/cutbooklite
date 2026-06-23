import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success } from '../../lib/response';

const salonId = (req: Request) => req.user!.salonId!;

function dateRange(range: string): { gte: Date; lte: Date } {
  const now = new Date();
  const lte = new Date(now);
  lte.setHours(23, 59, 59, 999);
  let gte = new Date(now);
  gte.setHours(0, 0, 0, 0);

  switch (range) {
    case 'yesterday':
      gte.setDate(gte.getDate() - 1);
      lte.setDate(lte.getDate() - 1);
      break;
    case 'week':
      gte.setDate(gte.getDate() - 6);
      break;
    case 'month':
      gte.setDate(1);
      break;
    case 'year':
      gte = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { gte, lte };
}

export async function getEarnings(req: Request, res: Response, next: NextFunction) {
  try {
    const { range = 'today', from, to } = req.query;
    const sid = salonId(req);
    const { gte, lte } = from && to
      ? { gte: new Date(from as string), lte: new Date(to as string) }
      : dateRange(range as string);

    const invoices = await prisma.invoice.findMany({
      where: { salonId: sid, status: 'paid', createdAt: { gte, lte }, deletedAt: null },
      include: { payments: true, items: { include: { service: true, barber: { include: { user: true } } } } },
    });

    const totalRevenue = invoices.reduce((acc, inv) => acc + Number(inv.totalPaise), 0);
    const byMethod: Record<string, number> = {};
    for (const inv of invoices) {
      for (const p of inv.payments) {
        byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amountPaise);
      }
    }

    const byBarber: Record<string, { name: string; revenue: number; count: number }> = {};
    const byService: Record<string, { name: string; revenue: number; count: number }> = {};

    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.barber) {
          const key = item.barberId;
          if (!byBarber[key]) byBarber[key] = { name: item.barber.user.name, revenue: 0, count: 0 };
          byBarber[key].revenue += Number(item.unitPricePaise) * item.quantity;
          byBarber[key].count += item.quantity;
        }
        if (item.service) {
          const key = item.serviceId || 'other';
          if (!byService[key]) byService[key] = { name: item.service.name, revenue: 0, count: 0 };
          byService[key].revenue += Number(item.unitPricePaise) * item.quantity;
          byService[key].count += item.quantity;
        }
      }
    }

    const expenses = await prisma.expense.findMany({ where: { salonId: sid, spentOn: { gte, lte } } });
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amountPaise), 0);

    res.json(success({
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      invoiceCount: invoices.length,
      byMethod,
      byBarber: Object.values(byBarber).sort((a, b) => b.revenue - a.revenue),
      byService: Object.values(byService).sort((a, b) => b.revenue - a.revenue),
    }));
  } catch (err) { next(err); }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const sid = salonId(req);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayRevenue, totalCustomers, activeStaff, pendingAppointments, lowStockItems] = await prisma.$transaction([
      prisma.invoice.aggregate({ where: { salonId: sid, status: 'paid', createdAt: { gte: today, lt: tomorrow } }, _sum: { totalPaise: true } }),
      prisma.customer.count({ where: { salonId: sid } }),
      prisma.barber.count({ where: { salonId: sid, status: 'active' } }),
      prisma.appointment.count({ where: { salonId: sid, status: { in: ['scheduled', 'confirmed'] }, scheduledStart: { gte: today, lt: tomorrow } } }),
      prisma.inventoryItem.findMany({ where: { salonId: sid }, select: { id: true, name: true, currentStock: true, lowStockThreshold: true } }),
    ]);

    const lowStock = lowStockItems.filter(i => Number(i.currentStock) <= Number(i.lowStockThreshold));

    res.json(success({
      todayRevenuePaise: Number(todayRevenue._sum.totalPaise || 0),
      totalCustomers,
      activeStaff,
      pendingAppointments,
      lowStockAlerts: lowStock.length,
    }));
  } catch (err) { next(err); }
}
