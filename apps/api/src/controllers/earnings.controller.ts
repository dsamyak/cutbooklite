import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const getEarningsDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salon_id, from, to } = req.query;
    const ownerId = req.user!.ownerId;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Missing date range (from, to)' });
    }

    const fromDate = new Date(String(from));
    const toDate = new Date(String(to));
    // Inclusive range for toDate: set to end of day if it's just a date
    toDate.setUTCHours(23, 59, 59, 999);

    let serviceWhere: any = {
      salon: { owner_id: ownerId },
      service_date: {
        gte: fromDate,
        lte: toDate
      }
    };

    let expenseWhere: any = {
      owner_id: ownerId,
      expense_date: {
        gte: fromDate,
        lte: toDate
      }
    };

    if (salon_id) {
      serviceWhere.salon_id = String(salon_id);
      expenseWhere.salon_id = String(salon_id);
    }

    const services = await prisma.service.findMany({
      where: serviceWhere
    });

    const expenses = await prisma.expense.findMany({
      where: expenseWhere
    });

    let cash = 0;
    let upi = 0;
    let product = 0; // Product is omitted for MVP since payment_type is CASH/UPI

    services.forEach(svc => {
      const p = Number(svc.price);
      if (svc.payment_type === 'CASH') cash += p;
      else if (svc.payment_type === 'UPI') upi += p;
    });

    const totalGross = cash + upi + product;
    
    let totalExpenses = 0;
    expenses.forEach(exp => {
      totalExpenses += Number(exp.amount);
    });

    const netEarning = totalGross - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { from, to },
        cash,
        upi,
        product,
        total_gross: totalGross,
        total_expenses: totalExpenses,
        net_earning: netEarning
      }
    });
  } catch (error) {
    next(error);
  }
};
