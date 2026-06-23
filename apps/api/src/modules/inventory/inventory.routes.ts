import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CreateInventoryItemSchema, StockMovementSchema } from '@cutbooklite/shared';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);
const sid = (req: Request) => req.user!.salonId!;

router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({ where: { salonId: sid(req) }, orderBy: { name: 'asc' } });
    res.json(success(items));
  } catch (e) { next(e); }
});

router.post('/items', validate(CreateInventoryItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.create({ data: { salonId: sid(req), ...req.body } });
    res.status(201).json(success(item));
  } catch (e) { next(e); }
});

router.patch('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, salonId: sid(req) } });
    if (!item) { res.status(404).json(failure('NOT_FOUND', 'Item not found')); return; }
    res.json(success(await prisma.inventoryItem.update({ where: { id: item.id }, data: req.body })));
  } catch (e) { next(e); }
});

router.post('/stock-movements', validate(StockMovementSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inventoryItemId, type, quantity } = req.body;
    const item = await prisma.inventoryItem.findFirst({ where: { id: inventoryItemId, salonId: sid(req) } });
    if (!item) throw new AppError('NOT_FOUND', 'Inventory item not found', 404);
    if (type === 'stock_out' && Number(item.currentStock) < quantity) throw new AppError('INSUFFICIENT_STOCK', 'Not enough stock', 400);
    const newStock = type === 'stock_in' ? Number(item.currentStock) + quantity : Number(item.currentStock) - quantity;
    await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id: item.id }, data: { currentStock: newStock } }),
      prisma.inventoryTransaction.create({ data: { inventoryItemId, type, quantity, createdBy: req.user!.userId } }),
    ]);
    res.json(success({ message: 'Stock updated', newStock }));
  } catch (e) { next(e); }
});

router.get('/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventoryItem.findMany({ where: { salonId: sid(req) } });
    const lowStock = items.filter(i => Number(i.currentStock) <= Number(i.lowStockThreshold));
    res.json(success(lowStock));
  } catch (e) { next(e); }
});

export default router;
