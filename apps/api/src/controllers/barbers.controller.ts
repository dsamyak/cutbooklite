import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

// ── GET /barbers/me — barber resolves their own salon(s) ──────
export const getMyDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;

    const barber = await prisma.barber.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        salon_barbers: {
          include: {
            salon: { select: { id: true, name: true, address: true } }
          }
        }
      }
    });

    if (!barber) return res.status(404).json({ success: false, message: 'Barber not found' });

    const salons = barber.salon_barbers.map(sb => sb.salon);

    res.json({
      success: true,
      data: {
        id: barber.id,
        name: barber.name,
        email: barber.email,
        salons
      }
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /barbers/earnings — barber's own earnings summary ─────
export const getMyEarnings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, ownerId } = req.user!;
    const { from, to, salon_id } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to query params are required' });
    }

    const fromDate = new Date(String(from));
    const toDate = new Date(String(to));
    toDate.setUTCHours(23, 59, 59, 999);

    // Fetch this barber's services
    const services = await prisma.service.findMany({
      where: {
        barber_id: userId,
        salon: { owner_id: ownerId },
        ...(salon_id ? { salon_id: String(salon_id) } : {}),
        service_date: { gte: fromDate, lte: toDate }
      },
      include: {
        barber: { select: { name: true } },
        salon: { select: { name: true } }
      },
      orderBy: { service_date: 'desc' }
    });

    // Fetch all barbers' earnings in same period (for leaderboard — gross only, no expenses)
    const allBarberServices = await prisma.service.findMany({
      where: {
        salon: { owner_id: ownerId },
        ...(salon_id ? { salon_id: String(salon_id) } : {}),
        service_date: { gte: fromDate, lte: toDate }
      },
      include: { barber: { select: { id: true, name: true } } }
    });

    // Aggregate per barber
    const leaderboard: Record<string, { barberId: string; name: string; total: number }> = {};
    allBarberServices.forEach(svc => {
      const id = svc.barber_id;
      if (!leaderboard[id]) leaderboard[id] = { barberId: id, name: svc.barber.name, total: 0 };
      leaderboard[id].total += Number(svc.price);
    });

    const leaderboardList = Object.values(leaderboard).sort((a, b) => b.total - a.total);

    let cash = 0, upi = 0;
    services.forEach(s => {
      if (s.payment_type === 'CASH') cash += Number(s.price);
      else if (s.payment_type === 'UPI') upi += Number(s.price);
    });

    res.json({
      success: true,
      data: {
        period: { from, to },
        cash,
        upi,
        total: cash + upi,
        services,
        leaderboard: leaderboardList
      }
    });
  } catch (error) {
    next(error);
  }
};
