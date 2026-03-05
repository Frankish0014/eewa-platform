/**
 * Role-Based Access Control middleware — allows only specified roles to proceed.
 */
import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../core/types';
import { ForbiddenError } from '../core/errors';

export function rbacMiddleware(allowedRoles: Role[]) {
  const set = new Set(allowedRoles);
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new ForbiddenError('Authentication required'));
      return;
    }
    if (!set.has(user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}

/**
 * Require one of the given permissions (for future permission-based checks).
 * Currently we use role-based; this can be extended with a permission matrix.
 */
export function requirePermission(_permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Authentication required'));
      return;
    }
    // TODO: map permission to roles or use Permission table
    next();
  };
}
