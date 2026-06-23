import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';
import crypto from 'crypto';

const salonId = (req: Request) => req.user!.salonId!;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeInvoiceTotals(items: Array<{ quantity: number; unitPricePaise: number; taxPercent: number }>) {
  let subtotal = BigInt(0);
  let tax = BigInt(0);
  for (const item of items) {
    const lineTotal = BigInt(item.quantity) * BigInt(Math.round(item.unitPricePaise));
    const lineTax = lineTotal * BigInt(Math.round(item.taxPercent * 100)) / BigInt(10000);
    subtotal += lineTotal;
    tax += lineTax;
  }
  return { subtotalPaise: subtotal, taxPaise: tax, totalPaise: subtotal + tax };
}

async function awardLoyaltyPoints(tx: any, customerId: string, invoiceId: string, totalPaise: bigint) {
  const points = Math.floor(Number(totalPaise) / 10000); // 1 point per ₹100
  if (points <= 0) return;
  await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { increment: points }, totalSpendPaise: { increment: totalPaise } } });
  await tx.loyaltyTransaction.create({ data: { customerId, invoiceId, points, reason: 'earn' } });
}

async function createCommissionEntries(tx: any, items: any[], barberId: string) {
  const barber = await tx.barber.findUnique({ where: { id: barberId } });
  if (!barber?.commissionPercent) return;
  for (const item of items) {
    const commission = BigInt(item.quantity) * BigInt(Math.round(Number(item.unitPricePaise))) * BigInt(Math.round(Number(barber.commissionPercent) * 100)) / BigInt(10000);
    const period = new Date().toISOString().slice(0, 7);
    await tx.commissionEntry.create({ data: { barberId, invoiceItemId: item.id, commissionAmountPaise: commission, period } });
  }
}

// ─── Walk-in ──────────────────────────────────────────────────────────────────

export async function createWalkIn(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId, barberId, serviceIds, branchId } = req.body;
    const walkIn = await prisma.walkIn.create({
      data: { salonId: salonId(req), branchId, customerId, barberId },
    });
    res.status(201).json(success(walkIn));
  } catch (err) { next(err); }
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export async function createInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const { appointmentId, walkInId, customerId, items } = req.body;
    const { subtotalPaise, taxPaise, totalPaise } = computeInvoiceTotals(items);

    const invoice = await prisma.invoice.create({
      data: {
        salonId: salonId(req),
        customerId,
        appointmentId,
        walkInId,
        subtotalPaise,
        taxPaise,
        totalPaise,
        status: 'draft',
        items: {
          create: items.map((item: any) => ({
            serviceId: item.serviceId,
            inventoryItemId: item.inventoryItemId,
            barberId: item.barberId,
            description: item.description,
            quantity: item.quantity,
            unitPricePaise: BigInt(Math.round(item.unitPricePaise)),
            taxPercent: item.taxPercent,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(success({ ...invoice, subtotalPaise: subtotalPaise.toString(), taxPaise: taxPaise.toString(), totalPaise: totalPaise.toString() }));
  } catch (err) { next(err); }
}

export async function listInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = '1', pageSize = '20', from, to } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const where: any = { salonId: salonId(req), deletedAt: null };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }
    const [data, total] = await prisma.$transaction([
      prisma.invoice.findMany({ where, skip, take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: { customer: true, payments: true } }),
      prisma.invoice.count({ where }),
    ]);
    res.json(success(data, { page: Number(page), pageSize: Number(pageSize), total }));
  } catch (err) { next(err); }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, salonId: salonId(req) },
      include: { items: { include: { service: true, barber: { include: { user: true } } } }, customer: true, payments: true },
    });
    if (!invoice) { res.status(404).json(failure('NOT_FOUND', 'Invoice not found')); return; }
    res.json(success(invoice));
  } catch (err) { next(err); }
}

// ─── Payment Capture ─────────────────────────────────────────────────────────

export async function capturePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { invoiceId, payments, loyaltyPointsRedeem } = req.body;
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, salonId: salonId(req) },
      include: { items: true, customer: true },
    });
    if (!invoice) throw new AppError('NOT_FOUND', 'Invoice not found', 404);
    if (invoice.status === 'paid') throw new AppError('ALREADY_PAID', 'Invoice already paid', 400);

    const totalPayments = payments.reduce((acc: bigint, p: any) => acc + BigInt(p.amountPaise), BigInt(0));
    let discountPaise = BigInt(0);

    await prisma.$transaction(async (tx) => {
      // Loyalty redemption
      if (loyaltyPointsRedeem && invoice.customerId) {
        const customer = invoice.customer!;
        if (customer.loyaltyPoints < loyaltyPointsRedeem) throw new AppError('INSUFFICIENT_POINTS', 'Not enough loyalty points', 400);
        discountPaise = BigInt(loyaltyPointsRedeem) * BigInt(100); // 1 point = ₹1
        await tx.customer.update({ where: { id: invoice.customerId }, data: { loyaltyPoints: { decrement: loyaltyPointsRedeem } } });
        await tx.loyaltyTransaction.create({ data: { customerId: invoice.customerId, invoiceId, points: -loyaltyPointsRedeem, reason: 'redeem' } });
      }

      // Create payment records
      await tx.payment.createMany({
        data: payments.map((p: any) => ({
          invoiceId,
          method: p.method,
          amountPaise: BigInt(p.amountPaise),
          razorpayPaymentId: p.razorpayPaymentId,
          status: 'captured',
        })),
      });

      // Mark invoice paid
      await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'paid', discountPaise } });

      // Award loyalty points
      if (invoice.customerId) await awardLoyaltyPoints(tx, invoice.customerId, invoiceId, invoice.totalPaise - discountPaise);

      // Create commission entries
      const barberIds = [...new Set(invoice.items.map(i => i.barberId))];
      for (const bid of barberIds) {
        const barberItems = invoice.items.filter(i => i.barberId === bid);
        await createCommissionEntries(tx, barberItems, bid);
      }

      // Update appointment status if linked
      if (invoice.appointmentId) {
        await tx.appointment.update({ where: { id: invoice.appointmentId }, data: { status: 'completed' } });
      }
    });

    res.json(success({ message: 'Payment captured successfully' }));
  } catch (err) { next(err); }
}

// ─── Razorpay Webhook ────────────────────────────────────────────────────────

export async function razorpayWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = JSON.stringify(req.body);
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest('hex');
    if (signature !== expectedSig) { res.status(400).json(failure('INVALID_SIGNATURE', 'Webhook signature mismatch')); return; }
    // Handle payment.captured event
    if (req.body.event === 'payment.captured') {
      const payment = req.body.payload?.payment?.entity;
      if (payment) {
        await prisma.payment.updateMany({ where: { razorpayPaymentId: payment.id }, data: { status: 'captured' } });
      }
    }
    res.json({ received: true });
  } catch (err) { next(err); }
}
