import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-please-change';

export interface AuthPayload {
  userId: string;
  role: 'OWNER' | 'BARBER';
  ownerId: string; // The tenant ID. For OWNER, it's their own ID. For BARBER, it's their employer's ID.
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireRole = (role: 'OWNER' | 'BARBER') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
    }
    next();
  };
};
