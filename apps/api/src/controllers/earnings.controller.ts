import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';

const earningsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
  salon_id: z.string().uuid().optional()
});

// ── GET /earnings — dashboard summary ────────────────────────
export const getEarningsDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = earningsQuerySchema.parse(req.query);
    const ownerId = req.user!.ownerId;

    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);
    toDate.setUTCHours(23, 59, 59, 999);

    const serviceWhere: any = {
      salon: { owner_id: ownerId },
      service_date: { gte: fromDate, lte: toDate }
    };
    const expenseWhere: any = {
      owner_id: ownerId,
      expense_date: { gte: fromDate, lte: toDate }
    };

    if (query.salon_id) {
      serviceWhere.salon_id = query.salon_id;
      expenseWhere.salon_id = query.salon_id;
    }

    const [services, expenses] = await Promise.all([
      prisma.service.findMany({
        where: serviceWhere,
        include: { barber: { select: { id: true, name: true } } }
      }),
      prisma.expense.findMany({ where: expenseWhere })
    ]);

    let cash = 0, upi = 0;
    services.forEach(svc => {
      const p = Number(svc.price);
      if (svc.payment_type === 'CASH') cash += p;
      else if (svc.payment_type === 'UPI') upi += p;
    });

    const totalGross = cash + upi;
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netEarning = totalGross - totalExpenses;

    // Per-barber breakdown
    const barberMap: Record<string, { barberId: string; name: string; cash: number; upi: number; total: number }> = {};
    services.forEach(svc => {
      const id = svc.barber_id;
      if (!barberMap[id]) {
        barberMap[id] = { barberId: id, name: svc.barber.name, cash: 0, upi: 0, total: 0 };
      }
      const p = Number(svc.price);
      if (svc.payment_type === 'CASH') barberMap[id].cash += p;
      else barberMap[id].upi += p;
      barberMap[id].total += p;
    });

    const barberBreakdown = Object.values(barberMap).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        period: { from: query.from, to: query.to },
        cash,
        upi,
        product: 0,
        total_gross: totalGross,
        total_expenses: totalExpenses,
        net_earning: netEarning,
        barber_breakdown: barberBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};
