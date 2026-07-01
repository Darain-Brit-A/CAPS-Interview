import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { UpstreamRateLimitError } from '../errors/AppError';
import { logger } from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  if (err instanceof UpstreamRateLimitError) {
    res.setHeader('Retry-After', err.retryAfter);
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      issue: e.message,
    }));
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
        requestId,
      },
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled exception');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
}
