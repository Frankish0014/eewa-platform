/**
 * Zod validation middleware — validates req.body/query/params and passes to handler.
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../core/errors';

export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const payload = { body: req.body, query: req.query, params: req.params };
    const result = schema.safeParse(payload);
    if (!result.success) {
      const details = result.error.flatten();
      next(new ValidationError('Validation failed', { fieldErrors: details.fieldErrors }));
      return;
    }
    const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (data.body !== undefined) req.body = data.body;
    if (data.query !== undefined) req.query = data.query as Request['query'];
    if (data.params !== undefined) req.params = data.params as Request['params'];
    next();
  };
}
