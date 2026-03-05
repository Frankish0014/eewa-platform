/**
 * Auth business logic — credential validation, JWT issuance, refresh.
 */
import type { AuthRepository } from './auth.repository';
import type { TokenService } from './token.service';
import { UnauthorizedError } from '../../core/errors';

export interface AuthService {
  login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }>;
  refresh(refreshToken: string | undefined): Promise<{ accessToken: string; expiresIn: number }>;
}

export function createAuthService(
  authRepo: AuthRepository,
  tokenService: TokenService
): AuthService {
  return {
    async login(email: string, password: string) {
      const user = await authRepo.findByEmail(email);
      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid credentials');
      }
      const valid = await authRepo.verifyPassword(user.id, password);
      if (!valid) {
        throw new UnauthorizedError('Invalid credentials');
      }
      const { accessToken, expiresIn } = tokenService.issueAccessToken(user);
      const refreshToken = tokenService.issueRefreshToken(user);
      return { accessToken, refreshToken, expiresIn };
    },

    async refresh(refreshToken: string | undefined) {
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token required');
      }
      const payload = tokenService.verifyRefreshToken(refreshToken);
      const user = await authRepo.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      const { accessToken, expiresIn } = tokenService.issueAccessToken(user);
      return { accessToken, expiresIn };
    },
  };
}
