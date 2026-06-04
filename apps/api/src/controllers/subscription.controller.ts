import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

// ── GET /subscription — current owner's subscription status ──
export const getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!.ownerId;

    const subscription = await prisma.subscription.findUnique({
      where: { owner_id: ownerId }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Compute days remaining
    let daysRemaining: number | null = null;
    if (subscription.current_period_end) {
      const msRemaining = subscription.current_period_end.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    const isExpired =
      subscription.current_period_end
        ? new Date() > subscription.current_period_end
        : false;

    res.json({
      success: true,
      data: {
        ...subscription,
        daysRemaining,
        isExpired,
        isActive: ['TRIAL', 'ACTIVE', 'GRACE'].includes(subscription.status) && !isExpired
      }
    });
  } catch (error) {
    next(error);
  }
};
