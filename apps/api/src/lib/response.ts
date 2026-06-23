import { ApiResponse } from '@cutbooklite/shared';

export function success<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> {
  return { success: true, data, meta: meta ?? undefined, error: null };
}

export function failure(code: string, message: string): ApiResponse<null> {
  return { success: false, data: null, error: { code, message } };
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
