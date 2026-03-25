/**
 * JWT issuance — access, refresh, and short-lived email-OTP pending tokens.
 */
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import type { JwtPayload, Role } from '../../core/types';
import type { UserForAuth } from './auth.repository';

export interface TokenService {
  issueAccessToken(user: UserForAuth): { accessToken: string; expiresIn: number };
  issueRefreshToken(user: UserForAuth): string;
  issueEmailOtpPendingToken(userId: string, challengeId: string): string;
  verifyAccessToken(token: string): JwtPayload;
  verifyRefreshToken(token: string): { sub: string };
  verifyEmailOtpPendingToken(token: string): { sub: string; chl: string };
}

const ACCESS_EXP = config.JWT_EXPIRES_IN;
const REFRESH_EXP = config.JWT_REFRESH_EXPIRES_IN;
const EMAIL_OTP_PENDING_EXP = config.JWT_EMAIL_OTP_PENDING_EXPIRES_IN;

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
  const emailOtpPendingSeconds = expiresInSeconds(EMAIL_OTP_PENDING_EXP);

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

    issueEmailOtpPendingToken(userId: string, challengeId: string) {
      return jwt.sign(
        { sub: userId, chl: challengeId, type: 'email_otp_pending' },
        secret,
        { expiresIn: emailOtpPendingSeconds }
      );
    },

    verifyAccessToken(token: string): JwtPayload {
      const decoded = jwt.verify(token, secret) as JwtPayload & { type?: string };
      if (decoded.type === 'refresh' || decoded.type === 'email_otp_pending') {
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

    verifyEmailOtpPendingToken(token: string): { sub: string; chl: string } {
      const decoded = jwt.verify(token, secret) as { sub: string; chl: string; type?: string };
      if (decoded.type !== 'email_otp_pending' || typeof decoded.chl !== 'string') {
        throw new Error('Invalid token type');
      }
      return { sub: decoded.sub, chl: decoded.chl };
    },
  };
}
