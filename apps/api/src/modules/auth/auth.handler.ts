import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { success, failure, AppError } from '../../lib/response';
import * as authService from './auth.service';
import { JwtPayload } from '../../middleware/auth';
import { logger } from '../../lib/logger';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { salon, user } = await authService.registerSalon(req.body);
    const payload: JwtPayload = {
      userId: user.id,
      salonId: salon.id,
      branchId: user.branchId,
      role: user.role,
    };
    const accessToken = authService.signAccessToken(payload);
    const refreshToken = await authService.createRefreshToken(user.id, payload, req.headers['user-agent']);
    res.status(201).json(success({ accessToken, refreshToken, user: { id: user.id, name: user.name, role: user.role, salon } }));
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, phone, password } = req.body;
    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
      include: { barberProfile: true },
    });
    if (!user || !user.passwordHash) {
      res.status(401).json(failure('INVALID_CREDENTIALS', 'Invalid email/phone or password'));
      return;
    }
    const valid = await authService.verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json(failure('INVALID_CREDENTIALS', 'Invalid email/phone or password'));
      return;
    }
    if (user.status === 'inactive') {
      res.status(403).json(failure('ACCOUNT_INACTIVE', 'Your account has been deactivated'));
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const payload: JwtPayload = {
      userId: user.id,
      salonId: user.salonId,
      branchId: user.branchId,
      role: user.role,
    };
    const accessToken = authService.signAccessToken(payload);
    const refreshToken = await authService.createRefreshToken(user.id, payload, req.headers['user-agent']);
    res.json(success({ accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, salonId: user.salonId, branchId: user.branchId } }));
  } catch (err) { next(err); }
}

export async function requestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone } = req.body;
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      res.status(404).json(failure('USER_NOT_FOUND', 'No account found with this phone number'));
      return;
    }
    const otp = await authService.generateOtp(phone);
    // In production: send SMS. For now log it.
    logger.info(`OTP for ${phone}: ${otp}`);
    res.json(success({ message: 'OTP sent successfully' }));
  } catch (err) { next(err); }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp } = req.body;
    const valid = await authService.verifyOtp(phone, otp);
    if (!valid) {
      res.status(401).json(failure('INVALID_OTP', 'Invalid or expired OTP'));
      return;
    }
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      res.status(404).json(failure('USER_NOT_FOUND', 'User not found'));
      return;
    }
    const payload: JwtPayload = { userId: user.id, salonId: user.salonId, branchId: user.branchId, role: user.role };
    const accessToken = authService.signAccessToken(payload);
    const refreshToken = await authService.createRefreshToken(user.id, payload, req.headers['user-agent']);
    res.json(success({ accessToken, refreshToken, user: { id: user.id, name: user.name, role: user.role, salonId: user.salonId } }));
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(401).json(failure('NO_REFRESH_TOKEN', 'Refresh token required'));
      return;
    }
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET!) as JwtPayload;
    } catch {
      res.status(401).json(failure('TOKEN_INVALID', 'Invalid refresh token'));
      return;
    }
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json(failure('TOKEN_EXPIRED', 'Refresh token expired or revoked'));
      return;
    }
    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { tokenHash: hash } });
    const newPayload: JwtPayload = { userId: payload.userId, salonId: payload.salonId, branchId: payload.branchId, role: payload.role };
    const accessToken = authService.signAccessToken(newPayload);
    const newRefreshToken = await authService.createRefreshToken(payload.userId, newPayload);
    res.json(success({ accessToken, refreshToken: newRefreshToken }));
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash: hash } });
    }
    res.json(success({ message: 'Logged out successfully' }));
  } catch (err) { next(err); }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.userId } });
    res.json(success({ message: 'Logged out from all devices' }));
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        salon: { include: { subscription: { include: { plan: true } } } },
        barberProfile: true,
      },
    });
    if (!user) {
      res.status(404).json(failure('NOT_FOUND', 'User not found'));
      return;
    }
    res.json(success(user));
  } catch (err) { next(err); }
}
