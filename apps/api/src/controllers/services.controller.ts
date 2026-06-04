import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const logService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salon_id, name, price, payment_type, service_date } = req.body;
    const { userId, role, ownerId } = req.user!;

    if (!salon_id || !name || price === undefined || !payment_type || !service_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify salon exists and belongs to the owner
    const salon = await prisma.salon.findFirst({ where: { id: salon_id, owner_id: ownerId } });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    let barber_id = userId;
    if (role === 'OWNER') {
      // If owner logs service, they must provide a barber_id
      barber_id = req.body.barber_id;
      if (!barber_id) return res.status(400).json({ success: false, message: 'barber_id is required for owner' });
      
      const barber = await prisma.barber.findFirst({ where: { id: barber_id, owner_id: ownerId } });
      if (!barber) return res.status(404).json({ success: false, message: 'Barber not found' });
    } else {
      // Verify barber works at this salon
      const salonBarber = await prisma.salonBarber.findUnique({
        where: { salon_id_barber_id: { salon_id, barber_id } }
      });
      if (!salonBarber) return res.status(403).json({ success: false, message: 'You do not work at this salon' });
    }

    const service = await prisma.service.create({
      data: {
        salon_id,
        barber_id,
        name,
        price,
        payment_type,
        service_date: new Date(service_date)
      }
    });

    res.status(201).json({ success: true, data: service });
  } catch (error) {
    next(error);
  }
};

export const getServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { salon_id } = req.query;
    const { userId, role, ownerId } = req.user!;

    let whereClause: any = { salon: { owner_id: ownerId } };

    if (salon_id) {
      whereClause.salon_id = String(salon_id);
    }

    if (role === 'BARBER') {
      // Barbers can only see their own services
      whereClause.barber_id = userId;
    }

    const services = await prisma.service.findMany({
      where: whereClause,
      orderBy: { service_date: 'desc' },
      include: { barber: { select: { name: true } }, salon: { select: { name: true } } }
    });

    res.json({ success: true, data: services });
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, price, payment_type, service_date } = req.body;
    const { userId, role, ownerId } = req.user!;

    const service = await prisma.service.findUnique({
      where: { id },
      include: { salon: true }
    });

    if (!service || service.salon.owner_id !== ownerId) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (role === 'BARBER' && service.barber_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        name,
        price,
        payment_type,
        service_date: service_date ? new Date(service_date) : undefined
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId, role, ownerId } = req.user!;

    const service = await prisma.service.findUnique({
      where: { id },
      include: { salon: true }
    });

    if (!service || service.salon.owner_id !== ownerId) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (role === 'BARBER' && service.barber_id !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await prisma.service.delete({ where: { id } });

    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    next(error);
  }
};
