import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure } from '../../lib/response';

const salonId = (req: Request) => req.user!.salonId!;

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page = '1', pageSize = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { salonId: salonId(req) };
    if (search) where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { mobile: { contains: search as string } },
    ];
    const [data, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, skip, take: Number(pageSize), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);
    res.json(success(data, { page: Number(page), pageSize: Number(pageSize), total }));
  } catch (err) { next(err); }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { mobile, birthday, anniversary, ...rest } = req.body;
    const existing = await prisma.customer.findUnique({ where: { salonId_mobile: { salonId: salonId(req), mobile } } });
    if (existing) { res.status(409).json(failure('DUPLICATE', 'Customer with this mobile already exists')); return; }
    const customer = await prisma.customer.create({
      data: {
        salonId: salonId(req),
        mobile,
        birthday: birthday ? new Date(birthday) : undefined,
        anniversary: anniversary ? new Date(anniversary) : undefined,
        ...rest,
      },
    });
    res.status(201).json(success(customer));
  } catch (err) { next(err); }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, salonId: salonId(req) },
      include: { preferredBarber: { include: { user: true } } },
    });
    if (!customer) { res.status(404).json(failure('NOT_FOUND', 'Customer not found')); return; }
    res.json(success(customer));
  } catch (err) { next(err); }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { birthday, anniversary, ...rest } = req.body;
    const customer = await prisma.customer.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!customer) { res.status(404).json(failure('NOT_FOUND', 'Customer not found')); return; }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...rest,
        birthday: birthday ? new Date(birthday) : undefined,
        anniversary: anniversary ? new Date(anniversary) : undefined,
      },
    });
    res.json(success(updated));
  } catch (err) { next(err); }
}

export async function getCustomerHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await prisma.customer.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!customer) { res.status(404).json(failure('NOT_FOUND', 'Customer not found')); return; }
    const invoices = await prisma.invoice.findMany({
      where: { customerId: customer.id, status: 'paid' },
      include: { items: { include: { service: true, barber: { include: { user: true } } } }, payments: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(success({ customer, invoices }));
  } catch (err) { next(err); }
}

export async function getCustomerLoyalty(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await prisma.customer.findFirst({ where: { id: req.params.id, salonId: salonId(req) } });
    if (!customer) { res.status(404).json(failure('NOT_FOUND', 'Customer not found')); return; }
    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json(success({ loyaltyPoints: customer.loyaltyPoints, transactions }));
  } catch (err) { next(err); }
}
