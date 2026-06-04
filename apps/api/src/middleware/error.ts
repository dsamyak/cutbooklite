import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Zod validation errors — always safe to expose
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Known application errors — always safe to expose
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Unknown errors — log internally, hide details in production
  console.error('[error]', {
    message: err?.message,
    stack: err?.stack,
    path: req.path,
    method: req.method,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err?.statusCode || 500;
  const message =
    isProduction && statusCode === 500
      ? 'Internal server error'
      : err?.message || 'Internal server error';

  res.status(statusCode).json({ success: false, message });
};
