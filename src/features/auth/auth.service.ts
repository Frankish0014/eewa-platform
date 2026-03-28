/**
 * Auth — register/login with trusted devices; email OTP on new browsers.
 */
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { AuthRepository } from './auth.repository';
import type { TokenService } from './token.service';
import type { AuditService } from '../audit/audit.service';
import type { EmailDelivery } from '../notifications/email-delivery';
import { hashPassword } from './auth.repository';
import { generateDeviceToken, hashDeviceToken } from './device-token';
import { config } from '../../config';
import { logger } from '../../common/logger';
import { AppError, UnauthorizedError, ConflictError } from '../../core/errors';

const MAX_TRUSTED_DEVICES = 10;
const OTP_BCRYPT_COST = 10;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function appBaseUrl(): string {
  const u = config.PUBLIC_APP_URL?.trim() || config.CORS_ORIGIN?.trim() || '';
  return u.replace(/\/$/, '');
}

export type LoginResult =
  | { accessToken: string; refreshToken: string; expiresIn: number; deviceToken: string }
  | { requiresEmailOtp: true; emailOtpToken: string };

export type RegisterResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  deviceToken: string;
};

export interface AuthServiceDeps {
  authRepo: AuthRepository;
  tokenService: TokenService;
  prisma: PrismaClient;
  emailDelivery: EmailDelivery;
  auditService?: AuditService;
}

export interface AuthService {
  login(email: string, password: string, deviceToken?: string): Promise<LoginResult>;
  completeEmailOtpLogin(emailOtpToken: string, code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    deviceToken: string;
  }>;
  register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    institutionName?: string;
    institutionCountry?: string;
  }): Promise<RegisterResult>;
  refresh(refreshToken: string | undefined): Promise<{ accessToken: string; expiresIn: number }>;
}

async function pruneTrustedDevicesIfNeeded(prisma: PrismaClient, userId: string): Promise<void> {
  const count = await prisma.trustedDevice.count({ where: { userId } });
  if (count < MAX_TRUSTED_DEVICES) return;
  const toRemove = count - MAX_TRUSTED_DEVICES + 1;
  const oldest = await prisma.trustedDevice.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'asc' },
    take: toRemove,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.trustedDevice.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
  }
}

function issueSession(
  tokenService: TokenService,
  user: {
    id: string;
    email: string;
    role: string;
    passwordHash: string | null;
    emailSignInOtpEnabled?: boolean;
  },
  deviceToken: string
) {
  const u = {
    id: user.id,
    email: user.email,
    role: user.role,
    passwordHash: user.passwordHash,
    emailSignInOtpEnabled: user.emailSignInOtpEnabled ?? false,
  };
  const { accessToken, expiresIn } = tokenService.issueAccessToken(u);
  const refreshToken = tokenService.issueRefreshToken(u);
  return { accessToken, refreshToken, expiresIn, deviceToken };
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const { authRepo, tokenService, prisma, emailDelivery, auditService } = deps;

  return {
    async register(input) {
      const existing = await authRepo.findByEmail(input.email);
      if (existing) {
        throw new ConflictError('An account with this email already exists');
      }
      const passwordHash = await hashPassword(input.password);
      let institutionId: string | undefined;
      if (input.role === 'InstitutionStaff' && input.institutionName?.trim() && input.institutionCountry?.trim()) {
        institutionId = await authRepo.findOrCreateInstitution(input.institutionName.trim(), input.institutionCountry.trim());
      }
      const user = await authRepo.createUser({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role ?? 'Student',
        institutionId,
      });
      await auditService?.log({
        userId: user.id,
        action: 'REGISTER',
        resourceType: 'User',
        resourceId: user.id,
      });
      const deviceToken = generateDeviceToken();
      const tokenHash = hashDeviceToken(deviceToken);
      await pruneTrustedDevicesIfNeeded(prisma, user.id);
      await prisma.trustedDevice.create({
        data: { userId: user.id, tokenHash },
      });

      const base = appBaseUrl();
      const roleLabel = user.role.replace(/([A-Z])/g, ' $1').trim();
      const welcomeText = [
        `Hi ${input.firstName},`,
        '',
        'Welcome to EEWA — your account was created successfully.',
        '',
        `Role: ${roleLabel}`,
        '',
        base
          ? `Sign in anytime at: ${base}`
          : 'You can sign in with the email and password you used to register.',
        '',
        'If you did not create this account, contact support.', 
        'through our admin email at f.ishimwe@alustudent.com or the phone number +250782658368',
        '',
        '— The EEWA team',
      ].join('\n');
      const welcomeHtml = [
        `<p>Hi ${escapeHtml(input.firstName)},</p>`,
        '<p><strong>Welcome to EEWA</strong> — your account was created successfully.</p>',
        `<p>Your account role: <strong>${escapeHtml(roleLabel)}</strong></p>`,
        base ? `<p>Sign in: <a href="${escapeHtml(base)}">${escapeHtml(base)}</a></p>` : '<p>You can sign in with the email and password you registered.</p>',
        '<p>If you did not create this account, contact support.</p>',
        '<p>— The EEWA team</p>',
      ].join('\n');

      try {
        await emailDelivery.sendMail(user.email, 'Welcome to EEWA — account created', welcomeText, welcomeHtml);
      } catch (e) {
        logger.warn('Welcome email failed (registration still succeeded)', {
          userId: user.id,
          email: user.email,
          message: e instanceof Error ? e.message : String(e),
        });
      }

      return issueSession(tokenService, user, deviceToken);
    },

    async login(email: string, password: string, deviceToken?: string) {
      const user = await authRepo.findByEmail(email);
      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid credentials');
      }
      const valid = await authRepo.verifyPassword(user.id, password);
      if (!valid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (deviceToken && deviceToken.length >= 32) {
        const tokenHash = hashDeviceToken(deviceToken);
        const trusted = await prisma.trustedDevice.findUnique({
          where: { userId_tokenHash: { userId: user.id, tokenHash } },
        });
        if (trusted) {
          await prisma.trustedDevice.update({
            where: { id: trusted.id },
            data: { lastUsedAt: new Date() },
          });
          await auditService?.log({
            userId: user.id,
            action: 'LOGIN_TRUSTED_DEVICE',
            resourceType: 'SESSION',
            resourceId: null,
          });
          return issueSession(tokenService, user, deviceToken);
        }
      }

      if (!user.emailSignInOtpEnabled) {
        const newDeviceToken = generateDeviceToken();
        const tokenHash = hashDeviceToken(newDeviceToken);
        await pruneTrustedDevicesIfNeeded(prisma, user.id);
        await prisma.trustedDevice.create({
          data: { userId: user.id, tokenHash },
        });
        await auditService?.log({
          userId: user.id,
          action: 'LOGIN',
          resourceType: 'SESSION',
          resourceId: null,
        });
        return issueSession(tokenService, user, newDeviceToken);
      }

      const resendAfterMs = config.EMAIL_OTP_RESEND_SECONDS * 1000;
      const recentOpen = await prisma.emailLoginChallenge.findFirst({
        where: {
          userId: user.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - resendAfterMs) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentOpen) {
        const emailOtpToken = tokenService.issueEmailOtpPendingToken(user.id, recentOpen.id);
        return { requiresEmailOtp: true, emailOtpToken };
      }

      await prisma.emailLoginChallenge.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      const codeNum = crypto.randomInt(0, 1_000_000);
      const code = codeNum.toString().padStart(6, '0');
      const codeHash = await bcrypt.hash(code, OTP_BCRYPT_COST);
      const expiresAt = new Date(Date.now() + config.EMAIL_OTP_CODE_TTL_MINUTES * 60 * 1000);

      const challenge = await prisma.emailLoginChallenge.create({
        data: { userId: user.id, codeHash, expiresAt },
      });

      const ttlText = `${config.EMAIL_OTP_CODE_TTL_MINUTES} minute(s)`;
      const body = [
        `Your EEWA sign-in code is: ${code}`,
        '',
        `This code expires in ${ttlText}. If you did not try to sign in, ignore this email.`,
      ].join('\n');
      const otpHtml = [
        '<p>Use this code to finish signing in to EEWA:</p>',
        `<p style="font-size:1.5rem;letter-spacing:0.25em;font-weight:bold;font-family:monospace;">${escapeHtml(code)}</p>`,
        `<p>This code expires in ${escapeHtml(ttlText)}.</p>`,
        '<p>If you did not try to sign in, you can ignore this email.</p>',
      ].join('\n');

      if (config.NODE_ENV === 'development') {
        logger.info('Email login OTP (dev)', { to: user.email, code });
      }

      try {
        await emailDelivery.sendMail(user.email, 'Your EEWA sign-in code', body, otpHtml);
      } catch (e) {
        logger.error('Sign-in OTP email failed', {
          userId: user.id,
          email: user.email,
          message: e instanceof Error ? e.message : String(e),
        });
        throw new AppError(
          'Could not send your sign-in code by email. Try again later or contact support if this continues.',
          503,
          'EMAIL_SEND_FAILED',
        );
      }

      await auditService?.log({
        userId: user.id,
        action: 'LOGIN_EMAIL_OTP_SENT',
        resourceType: 'SESSION',
        resourceId: null,
      });

      const emailOtpToken = tokenService.issueEmailOtpPendingToken(user.id, challenge.id);
      return { requiresEmailOtp: true, emailOtpToken };
    },

    async completeEmailOtpLogin(emailOtpToken: string, code: string) {
      let sub: string;
      let chl: string;
      try {
        ({ sub, chl } = tokenService.verifyEmailOtpPendingToken(emailOtpToken));
      } catch {
        throw new UnauthorizedError('Invalid or expired verification step');
      }

      const challenge = await prisma.emailLoginChallenge.findUnique({
        where: { id: chl },
      });
      if (!challenge || challenge.userId !== sub) {
        throw new UnauthorizedError('Invalid verification step');
      }
      if (challenge.consumedAt) {
        throw new UnauthorizedError('This code has already been used');
      }
      if (challenge.expiresAt < new Date()) {
        throw new UnauthorizedError('This code has expired');
      }

      const normalized = code.replace(/\s/g, '');
      const ok = await bcrypt.compare(normalized, challenge.codeHash);
      if (!ok) {
        throw new UnauthorizedError('Invalid code');
      }

      await prisma.emailLoginChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      const user = await authRepo.findById(sub);
      if (!user?.passwordHash) {
        throw new UnauthorizedError('User not found');
      }

      const deviceToken = generateDeviceToken();
      const tokenHash = hashDeviceToken(deviceToken);
      await pruneTrustedDevicesIfNeeded(prisma, user.id);
      await prisma.trustedDevice.create({
        data: { userId: user.id, tokenHash },
      });

      await auditService?.log({
        userId: user.id,
        action: 'LOGIN_EMAIL_OTP_VERIFIED',
        resourceType: 'SESSION',
        resourceId: null,
      });
      await auditService?.log({
        userId: user.id,
        action: 'LOGIN',
        resourceType: 'SESSION',
        resourceId: null,
      });

      return issueSession(tokenService, user, deviceToken);
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
