import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
}

export interface AuthPayload {
  userId: string;
  role: 'OWNER' | 'BARBER' | 'ADMIN';
  ownerId: string; // For OWNER/ADMIN this is their own id; for BARBER it is their employer's id
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Verify JWT ────────────────────────────────────────────────
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ── Require a specific role ───────────────────────────────────
export const requireRole = (...roles: Array<'OWNER' | 'BARBER' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

// ── Admin-only guard ──────────────────────────────────────────
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── Subscription gate (auto-expires if period_end passed) ─────
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!.ownerId;

    const sub = await prisma.subscription.findUnique({ where: { owner_id: ownerId } });

    if (!sub) {
      return res.status(402).json({
        success: false,
        message: 'No subscription found. Please contact admin.',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Auto-expire: if period has ended and status is still active/trial/grace
    if (
      sub.current_period_end &&
      new Date() > sub.current_period_end &&
      !['LAPSED', 'CANCELLED'].includes(sub.status)
    ) {
      await prisma.subscription.update({
        where: { owner_id: ownerId },
        data: { status: 'LAPSED' }
      });
      return res.status(402).json({
        success: false,
        message: 'Your subscription has expired. Please contact admin to renew.',
        code: 'SUBSCRIPTION_LAPSED'
      });
    }

    if (['LAPSED', 'CANCELLED'].includes(sub.status)) {
      return res.status(402).json({
        success: false,
        message: 'Your subscription is not active. Please contact admin.',
        code: 'SUBSCRIPTION_LAPSED'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
