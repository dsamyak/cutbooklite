import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';

export const getSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!.ownerId;

    const subscription = await prisma.subscription.findUnique({
      where: { owner_id: ownerId }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};
