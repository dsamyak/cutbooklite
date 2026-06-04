import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const createSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address } = req.body;
    const ownerId = req.user!.ownerId;

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const salon = await prisma.salon.create({
      data: {
        name,
        address,
        owner_id: ownerId
      }
    });

    res.status(201).json({ success: true, data: salon });
  } catch (error) {
    next(error);
  }
};

export const getSalons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!.ownerId;
    const salons = await prisma.salon.findMany({
      where: { owner_id: ownerId }
    });

    res.json({ success: true, data: salons });
  } catch (error) {
    next(error);
  }
};

export const getSalonById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;

    const salon = await prisma.salon.findFirst({
      where: { id, owner_id: ownerId }
    });

    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    res.json({ success: true, data: salon });
  } catch (error) {
    next(error);
  }
};

export const updateSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;
    const { name, address } = req.body;

    // Verify ownership
    const salon = await prisma.salon.findFirst({ where: { id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: { name, address }
    });

    res.json({ success: true, data: updatedSalon });
  } catch (error) {
    next(error);
  }
};

export const deleteSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;

    // Verify ownership
    const salon = await prisma.salon.findFirst({ where: { id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    await prisma.salon.delete({ where: { id } });

    res.json({ success: true, message: 'Salon deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getSalonBarbers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.ownerId;

    const salon = await prisma.salon.findFirst({ where: { id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const salonBarbers = await prisma.salonBarber.findMany({
      where: { salon_id: id },
      include: { barber: { select: { id: true, name: true, email: true } } }
    });

    const barbers = salonBarbers.map(sb => sb.barber);

    res.json({ success: true, data: barbers });
  } catch (error) {
    next(error);
  }
};

export const addBarberToSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, barber_id } = req.params;
    const ownerId = req.user!.ownerId;

    const salon = await prisma.salon.findFirst({ where: { id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const barber = await prisma.barber.findFirst({ where: { id: barber_id, owner_id: ownerId } });
    if (!barber) return res.status(404).json({ success: false, message: 'Barber not found in your organization' });

    const salonBarber = await prisma.salonBarber.create({
      data: { salon_id: id, barber_id: barber_id }
    });

    res.status(201).json({ success: true, data: salonBarber });
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Barber is already in this salon' });
    }
    next(error);
  }
};

export const removeBarberFromSalon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, barber_id } = req.params;
    const ownerId = req.user!.ownerId;

    const salon = await prisma.salon.findFirst({ where: { id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    await prisma.salonBarber.delete({
      where: {
        salon_id_barber_id: { salon_id: id, barber_id }
      }
    });

    res.json({ success: true, message: 'Barber removed from salon' });
  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Barber is not in this salon' });
    }
    next(error);
  }
};
