import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireTenant } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);
const sid = (req: Request) => req.user!.salonId!;

// Clock in
router.post('/clock-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const barberId = req.body.barberId || req.user!.userId;
    // Find barber by userId if staff is clocking in themselves
    let barber = await prisma.barber.findFirst({ where: { salonId: sid(req), id: barberId } });
    if (!barber) {
      barber = await prisma.barber.findFirst({ where: { salonId: sid(req), userId: req.user!.userId } });
    }
    if (!barber) throw new AppError('NOT_FOUND', 'Barber not found', 404);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await prisma.attendance.findFirst({ where: { barberId: barber.id, date: today, clockOutAt: null } });
    if (existing) { res.status(409).json(failure('ALREADY_CLOCKED_IN', 'Already clocked in')); return; }
    const att = await prisma.attendance.create({ data: { barberId: barber.id, clockInAt: new Date(), date: today } });
    res.status(201).json(success(att));
  } catch (e) { next(e); }
});

// Clock out
router.post('/clock-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attendanceId } = req.body;
    const att = await prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!att) { res.status(404).json(failure('NOT_FOUND', 'Attendance record not found')); return; }
    if (att.clockOutAt) { res.status(400).json(failure('ALREADY_CLOCKED_OUT', 'Already clocked out')); return; }
    const updated = await prisma.attendance.update({ where: { id: attendanceId }, data: { clockOutAt: new Date() } });
    res.json(success(updated));
  } catch (e) { next(e); }
});

// List attendance
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barberId, from, to } = req.query;
    const where: any = {};
    if (barberId) where.barberId = barberId;
    else {
      const barbers = await prisma.barber.findMany({ where: { salonId: sid(req) }, select: { id: true } });
      where.barberId = { in: barbers.map(b => b.id) };
    }
    if (from || to) { where.date = {}; if (from) where.date.gte = new Date(from as string); if (to) where.date.lte = new Date(to as string); }
    const records = await prisma.attendance.findMany({ where, include: { barber: { include: { user: true } } }, orderBy: { date: 'desc' } });
    res.json(success(records));
  } catch (e) { next(e); }
});

export default router;
