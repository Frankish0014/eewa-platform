/**
 * Global error handler — maps AppError to HTTP status, logs, returns JSON.
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../core/errors';
import type { Logger } from 'winston';

export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      logger.warn('AppError', { statusCode: err.statusCode, code: err.code, message: err.message });
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        ...(err instanceof ValidationError && err.details ? { details: err.details } : {}),
      });
      return;
    }
    logger.error('Unhandled error', { error: err });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  };
}
