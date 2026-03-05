/**
 * JWT authentication middleware — validates Bearer token and attaches user to request.
 */
import type { Request, Response, NextFunction } from 'express';
import type { TokenService } from '../features/auth/token.service';
import type { AuthenticatedRequest } from '../core/types';
import { UnauthorizedError } from '../core/errors';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequest;
    }
  }
}

export function authMiddleware(tokenService: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new UnauthorizedError('Missing or invalid Authorization header'));
      return;
    }
    const token = authHeader.slice(7);
    try {
      const payload = tokenService.verifyAccessToken(token);
      (req as Request & { user: AuthenticatedRequest }).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      next();
    } catch {
      next(new UnauthorizedError('Invalid or expired token'));
    }
  };
}
