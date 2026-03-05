/**
 * JWT issuance and verification — access and refresh tokens.
 */
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import type { JwtPayload, Role } from '../../core/types';
import type { UserForAuth } from './auth.repository';

export interface TokenService {
  issueAccessToken(user: UserForAuth): { accessToken: string; expiresIn: number };
  issueRefreshToken(user: UserForAuth): string;
  verifyAccessToken(token: string): JwtPayload;
  verifyRefreshToken(token: string): { sub: string };
}

const ACCESS_EXP = config.JWT_EXPIRES_IN;
const REFRESH_EXP = config.JWT_REFRESH_EXPIRES_IN;

function expiresInSeconds(exp: string): number {
  const match = exp.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const n = parseInt(match[1], 10);
  const u = match[2];
  if (u === 's') return n;
  if (u === 'm') return n * 60;
  if (u === 'h') return n * 3600;
  if (u === 'd') return n * 86400;
  return 900;
}

export function createTokenService(): TokenService {
  const secret = config.JWT_SECRET;
  const accessExpSeconds = expiresInSeconds(ACCESS_EXP);

  return {
    issueAccessToken(user: UserForAuth) {
      const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
        sub: user.id,
        email: user.email,
        role: user.role as Role,
      };
      const accessToken = jwt.sign(payload, secret, { expiresIn: accessExpSeconds });
      return { accessToken, expiresIn: accessExpSeconds };
    },

    issueRefreshToken(user: UserForAuth) {
      const refreshExpSeconds = expiresInSeconds(REFRESH_EXP);
      return jwt.sign({ sub: user.id, type: 'refresh' }, secret, { expiresIn: refreshExpSeconds });
    },

    verifyAccessToken(token: string): JwtPayload {
      const decoded = jwt.verify(token, secret) as JwtPayload & { type?: string };
      if (decoded.type === 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    },

    verifyRefreshToken(token: string): { sub: string } {
      const decoded = jwt.verify(token, secret) as { sub: string; type?: string };
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return { sub: decoded.sub };
    },
  };
}
