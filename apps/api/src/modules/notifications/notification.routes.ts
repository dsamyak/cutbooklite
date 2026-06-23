import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, requireTenant } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { UpdateNotificationPreferenceSchema } from '@cutbooklite/shared';
import { prisma } from '../../lib/prisma';
import { success } from '../../lib/response';

const router = Router();
router.use(authenticate, requireTenant);
const sid = (req: Request) => req.user!.salonId!;

router.get('/preferences', authorize('owner'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prefs = await prisma.notificationPreference.findMany({ where: { salonId: sid(req) } });
    res.json(success(prefs));
  } catch (e) { next(e); }
});

router.patch('/preferences', authorize('owner'), validate(UpdateNotificationPreferenceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { channel, eventType, enabled } = req.body;
    const pref = await prisma.notificationPreference.upsert({
      where: { salonId_channel_eventType: { salonId: sid(req), channel, eventType } },
      update: { enabled },
      create: { salonId: sid(req), channel, eventType, enabled },
    });
    res.json(success(pref));
  } catch (e) { next(e); }
});

export default router;
