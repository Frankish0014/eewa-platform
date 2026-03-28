/**
 * Global error handler — maps AppError to HTTP status, logs, returns JSON.
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../core/errors';
import type { Logger } from 'winston';

/** First human-readable string from Zod flatten() or inline fieldErrors (nested objects / string arrays). */
function firstValidationDetail(details: Record<string, unknown>): string | undefined {
  const takeArr = (a: unknown): string | undefined => {
    if (!Array.isArray(a)) return undefined;
    for (const x of a) {
      if (typeof x === 'string' && x.trim()) return x.trim();
    }
    return undefined;
  };
  const fromForm = takeArr(details.formErrors);
  if (fromForm) return fromForm;
  const walk = (node: unknown): string | undefined => {
    if (node == null) return undefined;
    if (typeof node === 'string') {
      const t = node.trim();
      return t || undefined;
    }
    if (Array.isArray(node)) {
      for (const x of node) {
        const d = walk(x);
        if (d) return d;
      }
      return undefined;
    }
    if (typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) {
        const d = walk(v);
        if (d) return d;
      }
    }
    return undefined;
  };
  return walk(details.fieldErrors);
}

export function errorHandler(logger: Logger) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      const vErr = err instanceof ValidationError ? err : null;
      const validationFields =
        vErr?.details &&
        typeof vErr.details === 'object' &&
        vErr.details.fieldErrors &&
        typeof vErr.details.fieldErrors === 'object' &&
        !Array.isArray(vErr.details.fieldErrors)
          ? Object.keys(vErr.details.fieldErrors as object)
          : undefined;
      logger.log({
        level: 'warn',
        message: 'AppError',
        statusCode: err.statusCode,
        code: err.code,
        errMessage: err.message,
        ...(validationFields?.length ? { validationFields } : {}),
      });
      if (vErr?.details) {
        const specific = firstValidationDetail(vErr.details);
        res.status(err.statusCode).json({
          error: specific ?? err.message,
          code: err.code,
          details: vErr.details,
        });
        return;
      }
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }
    const errObj = err instanceof Error ? err : new Error(String(err));
    logger.error('Unhandled error', {
      message: errObj.message,
      stack: errObj.stack,
      name: errObj.name,
    });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  };
}
