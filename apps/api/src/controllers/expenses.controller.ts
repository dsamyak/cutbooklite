import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const addExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salon_id, amount, category, expense_date, note } = req.body;
    const ownerId = req.user!.ownerId;

    if (!salon_id || amount === undefined || !category || !expense_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const salon = await prisma.salon.findFirst({ where: { id: salon_id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const expense = await prisma.expense.create({
      data: {
        salon_id,
        owner_id: ownerId,
        amount,
        category,
        expense_date: new Date(expense_date),
        note
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salon_id } = req.query;
    const ownerId = req.user!.ownerId;

    let whereClause: any = { owner_id: ownerId };
    if (salon_id) {
      whereClause.salon_id = String(salon_id);
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { expense_date: 'desc' },
      include: { salon: { select: { name: true } } }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;
    const { amount, category, expense_date, note } = req.body;

    const expense = await prisma.expense.findFirst({ where: { id, owner_id: ownerId } });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        amount,
        category,
        expense_date: expense_date ? new Date(expense_date) : undefined,
        note
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;

    const expense = await prisma.expense.findFirst({ where: { id, owner_id: ownerId } });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    await prisma.expense.delete({ where: { id } });

    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
};
