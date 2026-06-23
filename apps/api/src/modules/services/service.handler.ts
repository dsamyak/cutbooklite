import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

const salonId = (req: Request) => req.user!.salonId!;

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const cats = await prisma.serviceCategory.findMany({ where: { salonId: salonId(req) } });
    res.json(success(cats));
  } catch (err) { next(err); }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const cat = await prisma.serviceCategory.create({ data: { salonId: salonId(req), name: req.body.name } });
    res.status(201).json(success(cat));
  } catch (err) { next(err); }
}

export async function listServices(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const services = await prisma.service.findMany({
      where: { salonId: salonId(req), ...(status ? { status: status as any } : {}) },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(success(services));
  } catch (err) { next(err); }
}

export async function createService(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.create({
      data: { salonId: salonId(req), ...req.body },
      include: { category: true },
    });
    res.status(201).json(success(service));
  } catch (err) { next(err); }
}

export async function getService(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.findFirst({
      where: { id: req.params.id, salonId: salonId(req) },
      include: { category: true, barberServices: { include: { barber: { include: { user: true } } } } },
    });
    if (!service) { res.status(404).json(failure('NOT_FOUND', 'Service not found')); return; }
    res.json(success(service));
  } catch (err) { next(err); }
}

export async function updateService(req: Request, res: Response, next: NextFunction) {
  try {
    const service = await prisma.service.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!service) { res.status(404).json(failure('NOT_FOUND', 'Service not found')); return; }
    const updated = await prisma.service.update({ where: { id: service.id }, data: req.body, include: { category: true } });
    res.json(success(updated));
  } catch (err) { next(err); }
}
