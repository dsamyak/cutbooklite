import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { failure, AppError } from '../lib/response';
import { Role } from '@cutbooklite/shared';

export interface JwtPayload {
  userId: string;
  salonId: string | null;
  branchId: string | null;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(failure('UNAUTHORIZED', 'Missing or invalid authorization header'));
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json(failure('TOKEN_INVALID', 'Access token is invalid or expired'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json(failure('UNAUTHORIZED', 'Not authenticated'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json(failure('FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.salonId) {
    res.status(403).json(failure('NO_TENANT', 'This endpoint requires a salon context'));
    return;
  }
  next();
}
