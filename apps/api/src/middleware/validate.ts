import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { failure } from '../lib/response';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json(failure('VALIDATION_ERROR', errors));
      return;
    }
    req.body = result.data;
    next();
  };
}
