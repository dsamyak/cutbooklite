import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

export async function getSalon(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    // Owners can only fetch their own salon
    if (req.user!.role === 'owner' && req.user!.salonId !== id) {
      res.status(403).json(failure('FORBIDDEN', 'Access denied'));
      return;
    }
    const salon = await prisma.salon.findUnique({
      where: { id },
      include: { branches: true, subscription: { include: { plan: true } } },
    });
    if (!salon) { res.status(404).json(failure('NOT_FOUND', 'Salon not found')); return; }
    res.json(success(salon));
  } catch (err) { next(err); }
}

export async function updateSalon(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.user!.role === 'owner' && req.user!.salonId !== id) {
      res.status(403).json(failure('FORBIDDEN', 'Access denied'));
      return;
    }
    const salon = await prisma.salon.update({ where: { id }, data: req.body });
    res.json(success(salon));
  } catch (err) { next(err); }
}

export async function getBranches(req: Request, res: Response, next: NextFunction) {
  try {
    const { salonId } = req.params;
    const branches = await prisma.branch.findMany({ where: { salonId } });
    res.json(success(branches));
  } catch (err) { next(err); }
}

export async function createBranch(req: Request, res: Response, next: NextFunction) {
  try {
    const { salonId } = req.params;
    const branch = await prisma.branch.create({ data: { salonId, ...req.body } });
    res.status(201).json(success(branch));
  } catch (err) { next(err); }
}
