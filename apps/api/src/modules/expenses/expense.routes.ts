import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateExpenseSchema, CreateExpenseCategorySchema } from '@cutbooklite/shared';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);

const sid = (req: Request) => req.user!.salonId!;

router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(success(await prisma.expenseCategory.findMany({ where: { salonId: sid(req) } }))); } catch (e) { next(e); }
});

router.post('/categories', authorize('owner'), validate(CreateExpenseCategorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json(success(await prisma.expenseCategory.create({ data: { salonId: sid(req), name: req.body.name } }))); } catch (e) { next(e); }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, categoryId } = req.query;
    const where: any = { salonId: sid(req) };
    if (categoryId) where.categoryId = categoryId;
    if (from || to) { where.spentOn = {}; if (from) where.spentOn.gte = new Date(from as string); if (to) where.spentOn.lte = new Date(to as string); }
    const expenses = await prisma.expense.findMany({ where, include: { category: true }, orderBy: { spentOn: 'desc' } });
    const total = expenses.reduce((acc, e) => acc + Number(e.amountPaise), 0);
    res.json(success({ expenses, totalPaise: total }));
  } catch (e) { next(e); }
});

router.post('/', authorize('owner'), validate(CreateExpenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { spentOn, amountPaise, ...rest } = req.body;
    const expense = await prisma.expense.create({
      data: { salonId: sid(req), spentOn: new Date(spentOn), amountPaise: BigInt(amountPaise), createdBy: req.user!.userId, ...rest },
      include: { category: true },
    });
    res.status(201).json(success(expense));
  } catch (e) { next(e); }
});

router.delete('/:id', authorize('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.expense.findFirst({ where: { id: req.params.id, salonId: sid(req) } });
    if (!expense) { res.status(404).json(failure('NOT_FOUND', 'Expense not found')); return; }
    await prisma.expense.delete({ where: { id: expense.id } });
    res.json(success({ message: 'Deleted' }));
  } catch (e) { next(e); }
});

export default router;
