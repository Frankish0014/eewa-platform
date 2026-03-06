/**
 * Auth controller — login, refresh, logout (session invalidation placeholder).
 */
import type { Request, Response } from 'express';
import type { AuthService } from './auth.service';

export function createAuthController(authService: AuthService) {
  return {
    async register(req: Request, res: Response): Promise<void> {
      const { email, password, firstName, lastName, role } = req.body as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: string;
      };
      const result = await authService.register({ email, password, firstName, lastName, role });
      res.status(201).json(result);
    },

    async login(req: Request, res: Response): Promise<void> {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(email, password);
      res.json(result);
    },

    async refresh(req: Request, res: Response): Promise<void> {
      const refreshToken = req.body?.refreshToken as string | undefined;
      const result = await authService.refresh(refreshToken);
      res.json(result);
    },
  };
}
