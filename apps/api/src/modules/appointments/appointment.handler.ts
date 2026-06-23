import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';

const salonId = (req: Request) => req.user!.salonId!;

export async function listAppointments(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, barberId, status, from, to } = req.query;
    const where: any = { salonId: salonId(req), deletedAt: null };
    if (barberId) where.barberId = barberId;
    if (status) where.status = status;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      where.scheduledStart = { gte: d, lt: next };
    } else if (from || to) {
      where.scheduledStart = {};
      if (from) where.scheduledStart.gte = new Date(from as string);
      if (to) where.scheduledStart.lte = new Date(to as string);
    }
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        barber: { include: { user: true } },
        service: { include: { category: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });
    res.json(success(appointments));
  } catch (err) { next(err); }
}

export async function createAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const { barberId, serviceId, scheduledStart, customerId, branchId } = req.body;
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new AppError('NOT_FOUND', 'Service not found', 404);

    const start = new Date(scheduledStart);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Check for barber overlap
    const conflict = await prisma.appointment.findFirst({
      where: {
        barberId,
        deletedAt: null,
        status: { not: 'cancelled' },
        AND: [
          { scheduledStart: { lt: end } },
          { scheduledEnd: { gt: start } },
        ],
      },
    });
    if (conflict) throw new AppError('APPOINTMENT_CONFLICT', 'Barber already booked for this time slot', 409);

    const appointment = await prisma.appointment.create({
      data: {
        salonId: salonId(req),
        branchId,
        customerId,
        barberId,
        serviceId,
        scheduledStart: start,
        scheduledEnd: end,
        createdBy: req.user!.userId,
      },
      include: { customer: true, barber: { include: { user: true } }, service: true },
    });
    res.status(201).json(success(appointment));
  } catch (err) { next(err); }
}

export async function getAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, salonId: salonId(req) },
      include: { customer: true, barber: { include: { user: true } }, service: true, invoice: true },
    });
    if (!appt) { res.status(404).json(failure('NOT_FOUND', 'Appointment not found')); return; }
    res.json(success(appt));
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await prisma.appointment.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!appt) { res.status(404).json(failure('NOT_FOUND', 'Appointment not found')); return; }
    const updated = await prisma.appointment.update({ where: { id: appt.id }, data: { status: req.body.status } });
    res.json(success(updated));
  } catch (err) { next(err); }
}

export async function cancelAppointment(req: Request, res: Response, next: NextFunction) {
  try {
    const appt = await prisma.appointment.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!appt) { res.status(404).json(failure('NOT_FOUND', 'Appointment not found')); return; }
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'cancelled' } });
    res.json(success({ message: 'Appointment cancelled' }));
  } catch (err) { next(err); }
}
