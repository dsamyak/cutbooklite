import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;
const TRIAL_PERIOD_DAYS = Number(process.env.TRIAL_PERIOD_DAYS || 14);

// ── Zod schemas ───────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const inviteBarberSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  tempPassword: z.string().min(6, 'Temporary password must be at least 6 characters')
});

const acceptInviteSchema = z.object({
  email: z.string().email(),
  tempPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

// ── Helpers ───────────────────────────────────────────────────
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const makeToken = (userId: string, role: 'OWNER' | 'BARBER' | 'ADMIN', ownerId: string) =>
  jwt.sign({ userId, role, ownerId }, JWT_SECRET, { expiresIn: '7d' });

// ── Register Owner ────────────────────────────────────────────
export const registerOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.owner.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const now = new Date();

    const owner = await prisma.owner.create({
      data: {
        email: body.email,
        password_hash,
        name: body.name,
        subscription: {
          create: {
            status: 'TRIAL',
            plan_name: 'Free Trial',
            billing_provider: 'ADMIN',
            current_period_start: now,
            current_period_end: addDays(now, TRIAL_PERIOD_DAYS)
          }
        }
      },
      include: { subscription: true }
    });

    const token = makeToken(owner.id, 'OWNER', owner.id);

    res.status(201).json({
      success: true,
      data: { id: owner.id, email: owner.email, name: owner.name, role: 'OWNER' },
      token
    });
  } catch (error) {
    next(error);
  }
};

// ── Login (Owner or Barber) ───────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);

    // Check owner first
    let user: any = await prisma.owner.findUnique({ where: { email: body.email } });
    let role: 'OWNER' | 'BARBER' | 'ADMIN' = 'OWNER';
    let ownerId: string = user?.id;

    if (user) {
      // Admin check
      if (user.is_admin) role = 'ADMIN';
    } else {
      // Try barber
      user = await prisma.barber.findUnique({ where: { email: body.email } });
      role = 'BARBER';
      if (user) ownerId = user.owner_id;
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(body.password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = makeToken(user.id, role, ownerId);

    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name, role, ownerId },
      token
    });
  } catch (error) {
    next(error);
  }
};

// ── Invite Barber ─────────────────────────────────────────────
export const inviteBarber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = inviteBarberSchema.parse(req.body);
    const ownerId = req.user!.ownerId;

    const existing = await prisma.barber.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A barber with this email already exists' });
    }

    const password_hash = await bcrypt.hash(body.tempPassword, SALT_ROUNDS);

    const barber = await prisma.barber.create({
      data: { email: body.email, name: body.name, password_hash, owner_id: ownerId }
    });

    res.status(201).json({
      success: true,
      data: { id: barber.id, email: barber.email, name: barber.name }
    });
  } catch (error) {
    next(error);
  }
};

// ── Accept Invite (barber sets own password) ──────────────────
export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = acceptInviteSchema.parse(req.body);

    const barber = await prisma.barber.findUnique({ where: { email: body.email } });
    if (!barber) return res.status(404).json({ success: false, message: 'Barber not found' });

    const isMatch = await bcrypt.compare(body.tempPassword, barber.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid temporary password' });

    const password_hash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);
    await prisma.barber.update({ where: { email: body.email }, data: { password_hash } });

    res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
