/**
 * Auth controller — register, login, email OTP step, refresh.
 */
import type { Request, Response } from 'express';
import type { AuthService } from './auth.service';

export function createAuthController(authService: AuthService) {
  return {
    async register(req: Request, res: Response): Promise<void> {
      const { email, password, firstName, lastName, role, institutionName, institutionCountry } = req.body as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: string;
        institutionName?: string;
        institutionCountry?: string;
      };
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        role,
        institutionName,
        institutionCountry,
      });
      res.status(201).json(result);
    },

    async login(req: Request, res: Response): Promise<void> {
      const { email, password, deviceToken } = req.body as {
        email: string;
        password: string;
        deviceToken?: string;
      };
      const result = await authService.login(email, password, deviceToken);
      res.json(result);
    },

    async verifyEmailOtp(req: Request, res: Response): Promise<void> {
      const { emailOtpToken, code } = req.body as { emailOtpToken: string; code: string };
      const result = await authService.completeEmailOtpLogin(emailOtpToken, code);
      res.json(result);
    },

    async refresh(req: Request, res: Response): Promise<void> {
      const refreshToken = req.body?.refreshToken as string | undefined;
      const result = await authService.refresh(refreshToken);
      res.json(result);
    },

    async forgotPassword(req: Request, res: Response): Promise<void> {
      const { email } = req.body as { email: string };
      await authService.requestPasswordReset(email);
      res.json({
        message:
          'If an account exists for this email, we sent instructions to reset your password.',
      });
    },

    async resetPasswordWithToken(req: Request, res: Response): Promise<void> {
      const { token, password } = req.body as { token: string; password: string };
      await authService.resetPassword(token, password);
      res.json({
        message: 'Your password has been updated. You can sign in with your new password.',
      });
    },
  };
}
