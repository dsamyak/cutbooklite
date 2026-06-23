import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';
import * as authService from '../auth/auth.service';

const salonId = (req: Request) => req.user!.salonId!;

export async function listStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const barbers = await prisma.barber.findMany({
      where: { salonId: salonId(req) },
      include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } }, barberServices: { include: { service: true } } },
    });
    res.json(success(barbers));
  } catch (err) { next(err); }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, password, joiningDate, salaryType, commissionPercent, branchId, serviceIds } = req.body;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (existing) { res.status(409).json(failure('DUPLICATE', 'Email or phone already in use')); return; }

    const passwordHash = await authService.hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { salonId: salonId(req), branchId, role: 'staff', name, email, phone, passwordHash },
      });
      const barber = await tx.barber.create({
        data: {
          userId: user.id,
          salonId: salonId(req),
          branchId,
          joiningDate: new Date(joiningDate),
          salaryType,
          commissionPercent,
        },
      });
      if (serviceIds?.length) {
        await tx.barberService.createMany({
          data: serviceIds.map((sid: string) => ({ barberId: barber.id, serviceId: sid })),
          skipDuplicates: true,
        });
      }
      return { user, barber };
    });
    res.status(201).json(success(result));
  } catch (err) { next(err); }
}

export async function getStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const barber = await prisma.barber.findFirst({
      where: { id: req.params.id, salonId: salonId(req) },
      include: { user: true, barberServices: { include: { service: true } } },
    });
    if (!barber) { res.status(404).json(failure('NOT_FOUND', 'Staff not found')); return; }
    res.json(success(barber));
  } catch (err) { next(err); }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phone, joiningDate, salaryType, commissionPercent, branchId } = req.body;
    const barber = await prisma.barber.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!barber) { res.status(404).json(failure('NOT_FOUND', 'Staff not found')); return; }
    await prisma.$transaction([
      prisma.user.update({ where: { id: barber.userId }, data: { name, email, phone, branchId } }),
      prisma.barber.update({ where: { id: barber.id }, data: { joiningDate: joiningDate ? new Date(joiningDate) : undefined, salaryType, commissionPercent, branchId } }),
    ]);
    res.json(success({ message: 'Staff updated' }));
  } catch (err) { next(err); }
}

export async function deactivateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const barber = await prisma.barber.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!barber) { res.status(404).json(failure('NOT_FOUND', 'Staff not found')); return; }
    await prisma.$transaction([
      prisma.barber.update({ where: { id: barber.id }, data: { status: 'inactive' } }),
      prisma.user.update({ where: { id: barber.userId }, data: { status: 'inactive' } }),
    ]);
    res.json(success({ message: 'Staff deactivated' }));
  } catch (err) { next(err); }
}

export async function assignServices(req: Request, res: Response, next: NextFunction) {
  try {
    const { serviceIds } = req.body;
    const barber = await prisma.barber.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!barber) { res.status(404).json(failure('NOT_FOUND', 'Staff not found')); return; }
    await prisma.barberService.deleteMany({ where: { barberId: barber.id } });
    if (serviceIds?.length) {
      await prisma.barberService.createMany({
        data: serviceIds.map((sid: string) => ({ barberId: barber.id, serviceId: sid })),
        skipDuplicates: true,
      });
    }
    res.json(success({ message: 'Services assigned' }));
  } catch (err) { next(err); }
}
