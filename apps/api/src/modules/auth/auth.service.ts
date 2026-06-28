import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/response';
import { Role } from '@cutbooklite/shared';
import { JwtPayload } from '../../middleware/auth';
import crypto from 'crypto';
import { redis } from '../../lib/redis';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_DAYS = 30;
const OTP_TTL_SECONDS = 300; // 5 minutes

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` } as jwt.SignOptions);
}

export async function createRefreshToken(userId: string, payload: JwtPayload, deviceInfo?: string): Promise<string> {
  const token = signRefreshToken(payload);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, deviceInfo, expiresAt },
  });

  return token;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerSalon(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  salonName: string;
  city: string;
  state: string;
  address: string;
}) {
  // Check if email/phone already in use
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { phone: data.phone }] },
  });
  if (existing) throw new AppError('DUPLICATE_USER', 'Email or phone already registered', 409);

  // Get Basic plan for default subscription
  const basicPlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Basic' } });

  return prisma.$transaction(async (tx) => {
    // Create salon
    const salon = await tx.salon.create({
      data: {
        name: data.salonName,
        ownerName: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        status: 'pending',
      },
    });

    // Create primary branch
    const branch = await tx.branch.create({
      data: { salonId: salon.id, name: data.salonName, address: data.address, isPrimary: true },
    });

    // Create trial subscription
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 14);
    if (basicPlan) {
      const sub = await tx.subscription.create({
        data: {
          salonId: salon.id,
          planId: basicPlan.id,
          status: 'trialing',
          currentPeriodEnd: periodEnd,
        },
      });
      await tx.salon.update({ where: { id: salon.id }, data: { subscriptionId: sub.id } });
    }

    // Create owner user
    const passwordHash = await hashPassword(data.password);
    const user = await tx.user.create({
      data: {
        salonId: salon.id,
        branchId: branch.id,
        role: 'owner',
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
    });

    // Default expense categories
    await tx.expenseCategory.createMany({
      data: [
        { salonId: salon.id, name: 'Rent' },
        { salonId: salon.id, name: 'Electricity' },
        { salonId: salon.id, name: 'Salary' },
        { salonId: salon.id, name: 'Inventory Purchase' },
        { salonId: salon.id, name: 'Marketing' },
        { salonId: salon.id, name: 'Other' },
      ],
    });

    // Default service categories
    await tx.serviceCategory.createMany({
      data: [
        { salonId: salon.id, name: 'Hair' },
        { salonId: salon.id, name: 'Skin' },
        { salonId: salon.id, name: 'Nail' },
        { salonId: salon.id, name: 'Spa' },
        { salonId: salon.id, name: 'Beard' },
      ],
    });

    return { salon, user };
  });
}

// Redis-backed OTP store (works across instances, auto-expires)
function otpKey(phone: string): string {
  return `otp:${phone}`;
}

export async function generateOtp(phone: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.setex(otpKey(phone), OTP_TTL_SECONDS, otp);
  return otp;
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get<string>(otpKey(phone));
  if (!stored || stored !== otp) return false;
  await redis.del(otpKey(phone));
  return true;
}

