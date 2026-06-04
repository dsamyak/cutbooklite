import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';

// ── Zod schemas ───────────────────────────────────────────────
const updateSubscriptionSchema = z.object({
  status: z.enum(['TRIAL', 'ACTIVE', 'GRACE', 'LAPSED', 'CANCELLED']),
  plan_name: z.string().min(1).optional(),
  current_period_end: z.string().datetime({ message: 'Must be ISO 8601 datetime' }).optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

// ── GET /admin/owners ─────────────────────────────────────────
export const getAllOwners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const owners = await prisma.owner.findMany({
      where: { is_admin: false },
      include: {
        subscription: true,
        _count: { select: { salons: true, barbers: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    // Strip password hashes from response
    const sanitized = owners.map(({ password_hash, ...o }) => o);

    res.json({ success: true, data: sanitized });
  } catch (error) {
    next(error);
  }
};

// ── PATCH /admin/owners/:id/subscription ─────────────────────
export const updateOwnerSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = updateSubscriptionSchema.parse(req.body);

    const owner = await prisma.owner.findFirst({ where: { id, is_admin: false } });
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const periodEnd = body.current_period_end ? new Date(body.current_period_end) : undefined;

    const subscription = await prisma.subscription.upsert({
      where: { owner_id: id },
      update: {
        status: body.status,
        plan_name: body.plan_name ?? 'Admin Plan',
        current_period_start: body.status === 'ACTIVE' ? new Date() : undefined,
        current_period_end: periodEnd,
        notes: body.notes ?? null,
        billing_provider: 'ADMIN'
      },
      create: {
        owner_id: id,
        status: body.status,
        plan_name: body.plan_name ?? 'Admin Plan',
        billing_provider: 'ADMIN',
        current_period_start: new Date(),
        current_period_end: periodEnd,
        notes: body.notes ?? null
      }
    });

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /admin/owners/:id ──────────────────────────────────
export const deleteOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const owner = await prisma.owner.findFirst({ where: { id, is_admin: false } });
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    await prisma.owner.delete({ where: { id } });
    res.json({ success: true, message: 'Owner account deleted' });
  } catch (error) {
    next(error);
  }
};
