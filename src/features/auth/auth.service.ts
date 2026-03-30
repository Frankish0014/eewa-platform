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
import { config, resolveSmtpMailbox } from '../../config';
import { logger } from '../../common/logger';
import { AppError, UnauthorizedError, ConflictError } from '../../core/errors';

const MAX_TRUSTED_DEVICES = 10;
const OTP_BCRYPT_COST = 10;

function hashPasswordResetToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

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
  /** Idempotent; does not reveal whether the email exists. Sends mail only for password-based accounts. */
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
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
      const first = input.firstName.trim() || 'there';
      const support = config.SUPPORT_EMAIL?.trim();
      const fromMailbox = resolveSmtpMailbox(config) || 'the EEWA platform';

      const signInLine = base
        ? `Sign in: ${base}`
        : 'Sign in with the email address and password you used when you registered.';

      const welcomeText = [
        `Dear ${first},`,
        '',
        'Thank you for joining EEWA (Entrepreneur Empowerment Web Application). Your registration is complete and your account is now active.',
        '',
        'EEWA is built for student entrepreneurs across Africa: to discover opportunities, work with mentors, and strengthen ventures from idea to impact. We are pleased to have you with us.',
        '',
        `Account type: ${roleLabel}`,
        signInLine,
        '',
        'Suggested next steps:',
        '• Complete your profile so mentors, institutions, and partners can understand your background and goals.',
        '• Explore opportunities that align with your sector and stage.',
        '• Use the platform to connect with mentors and peers when you are ready for guidance or collaboration.',
        '',
        `This is an automated message from ${fromMailbox}. Please do not reply to this address; it is not monitored.`,
        support
          ? `For assistance, please contact us at ${support}, or use the help options on the EEWA website.`
          : 'For assistance, please use the contact or help options on the EEWA website.',
        '',
        'If you did not register for EEWA, you may disregard this email. No further action is required.',
        '',
        'Kind regards,',
        'The EEWA Team',
      ].join('\n');

      const signInBlock = base
        ? `<p style="margin:16px 0;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;"><a href="${escapeHtml(base)}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Sign in to EEWA</a></p><p style="margin:0;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#6b7280;word-break:break-all;">${escapeHtml(base)}</p>`
        : '<p style="font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;">Sign in with the email and password you used to register.</p>';

      const helpLineHtml = support
        ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#6b7280;">For assistance: <a href="mailto:${escapeHtml(support)}" style="color:#1d4ed8;">${escapeHtml(support)}</a>, or use the options on the EEWA website.</p>`
        : '<p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#6b7280;">For assistance, use the contact or help options on the EEWA website.</p>';

      const welcomeHtml = [
        '<div style="max-width:560px;margin:0 auto;padding:28px 24px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#111827;background:#fafafa;">',
        '<div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">',
        '<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1d4ed8;">EEWA</p>',
        `<p style="margin:0 0 18px;font-size:20px;font-weight:600;line-height:1.35;color:#111827;">Welcome, ${escapeHtml(first)}</p>`,
        '<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#374151;">Thank you for joining <strong>EEWA</strong> (Entrepreneur Empowerment Web Application). Your registration is complete and your account is <strong>active</strong>.</p>',
        '<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#374151;">EEWA supports student entrepreneurs across Africa: to discover opportunities, work with mentors, and strengthen ventures from idea to impact. We are glad you are here.</p>',
        `<p style="margin:0 0 6px;font-size:14px;color:#6b7280;">Account type</p>`,
        `<p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#111827;">${escapeHtml(roleLabel)}</p>`,
        signInBlock,
        '<p style="margin:24px 0 12px;font-size:15px;font-weight:600;color:#111827;">Suggested next steps</p>',
        '<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.6;color:#374151;">',
        '<li style="margin-bottom:10px;">Complete your profile so others understand your background and goals.</li>',
        '<li style="margin-bottom:10px;">Explore opportunities that fit your role, sector, and stage.</li>',
        '<li style="margin-bottom:10px;">Connect with mentors and peers when you want guidance or collaboration.</li>',
        '</ul>',
        '<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">',
        `<p style="margin:0 0 12px;font-size:13px;line-height:1.55;color:#6b7280;">This is an automated message from <strong style="color:#374151;">${escapeHtml(fromMailbox)}</strong>. Please do not reply to this address; it is not monitored.</p>`,
        helpLineHtml,
        '<p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#6b7280;">If you did not register for EEWA, you may disregard this message.</p>',
        '<p style="margin:24px 0 0;font-size:15px;line-height:1.5;color:#111827;"><strong>Kind regards,</strong><br><span style="color:#4b5563;">The EEWA Team</span></p>',
        '</div></div></div>',
      ].join('');

      try {
        await emailDelivery.sendMail(user.email, 'Welcome to EEWA — your account is active', welcomeText, welcomeHtml);
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

      // Only the account’s preference matters here. (Deployment SMTP / production checks happen before send.)
      const signInOtpAllowed = user.emailSignInOtpEnabled;
      if (!signInOtpAllowed) {
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

      if (config.NODE_ENV === 'production' && !config.SMTP_HOST?.trim()) {
        await prisma.emailLoginChallenge.delete({ where: { id: challenge.id } }).catch(() => {
          /* best-effort */
        });
        throw new AppError(
          'Sign-in codes are not being sent because email (SMTP) is not configured on this server. Contact your administrator.',
          503,
          'EMAIL_NOT_CONFIGURED',
        );
      }

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

    async requestPasswordReset(email: string) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return;

      const user = await authRepo.findByEmail(normalized);
      if (!user?.passwordHash) {
        return;
      }

      const cooldownMs = config.PASSWORD_RESET_RESEND_SECONDS * 1000;
      const recent = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - cooldownMs) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recent) {
        return;
      }

      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const rawToken = crypto.randomBytes(32).toString('base64url');
      const tokenHash = hashPasswordResetToken(rawToken);
      const expiresAt = new Date(
        Date.now() + config.PASSWORD_RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000,
      );

      const resetRow = await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const base = appBaseUrl();
      const resetPath = `/reset-password?token=${encodeURIComponent(rawToken)}`;
      const resetUrl = base ? `${base.replace(/\/$/, '')}${resetPath}` : resetPath;
      const ttlHours = config.PASSWORD_RESET_TOKEN_TTL_HOURS;
      const ttlLabel =
        ttlHours === 1 ? '1 hour' : `${ttlHours} hours`;

      const support = config.SUPPORT_EMAIL?.trim();
      const fromMailbox = resolveSmtpMailbox(config) || 'the EEWA platform';

      const bodyText = [
        'You asked to reset your EEWA password.',
        '',
        `Use this link to choose a new password (valid for ${ttlLabel}):`,
        resetUrl,
        '',
        'If you did not request this, you can ignore this email. Your password will stay the same.',
        support
          ? `Need help? Contact ${support}.`
          : 'Need help? Use the contact options on the EEWA website.',
        '',
        `This message was sent by ${fromMailbox}.`,
      ].join('\n');

      const linkBlock = base
        ? `<p style="margin:16px 0;font-family:system-ui,Segoe UI,sans-serif;font-size:16px;line-height:1.5;"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset password</a></p><p style="margin:0;font-family:system-ui,Segoe UI,sans-serif;font-size:13px;color:#6b7280;word-break:break-all;">${escapeHtml(resetUrl)}</p>`
        : `<p style="font-family:system-ui,Segoe UI,sans-serif;font-size:14px;color:#374151;word-break:break-all;"><strong>Set PUBLIC_APP_URL</strong> so this email contains a clickable link. Path only: <code>${escapeHtml(resetPath)}</code></p>`;

      const helpLineHtml = support
        ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#6b7280;">Need help? <a href="mailto:${escapeHtml(support)}" style="color:#1d4ed8;">${escapeHtml(support)}</a></p>`
        : '';

      const bodyHtml = [
        '<div style="max-width:560px;margin:0 auto;padding:28px 24px;font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#111827;background:#fafafa;">',
        '<div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">',
        '<p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#111827;">Reset your EEWA password</p>',
        '<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#374151;">We received a request to reset the password for your account. Click the button below to choose a new password.</p>',
        linkBlock,
        `<p style="margin:18px 0 0;font-size:14px;color:#6b7280;">This link expires in <strong>${escapeHtml(ttlLabel)}</strong>.</p>`,
        '<p style="margin:18px 0 0;font-size:14px;line-height:1.55;color:#374151;">If you did not ask for this, you can ignore this email.</p>',
        helpLineHtml,
        `<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Sent by ${escapeHtml(fromMailbox)}</p>`,
        '</div></div>',
      ].join('');

      if (config.NODE_ENV === 'development') {
        logger.info('Password reset link (dev)', { to: user.email, resetUrl });
      }

      try {
        await emailDelivery.sendMail(user.email, 'Reset your EEWA password', bodyText, bodyHtml);
      } catch (e) {
        await prisma.passwordResetToken.delete({ where: { id: resetRow.id } }).catch(() => {
          /* best-effort — avoid leaving a usable token if email never arrived */
        });
        logger.error('Password reset email failed', {
          userId: user.id,
          email: user.email,
          message: e instanceof Error ? e.message : String(e),
        });
        throw new AppError(
          'Could not send the reset email. Try again later or contact support.',
          503,
          'EMAIL_SEND_FAILED',
        );
      }

      await auditService?.log({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'User',
        resourceId: user.id,
      });
    },

    async resetPassword(token: string, newPassword: string) {
      const normalized = token.trim();
      if (normalized.length < 32) {
        throw new AppError(
          'This reset link is invalid or has expired. Request a new one from the sign-in page.',
          400,
          'INVALID_RESET_TOKEN',
        );
      }
      const tokenHash = hashPasswordResetToken(normalized);

      const row = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
      });
      if (!row || row.usedAt || row.expiresAt < new Date()) {
        throw new AppError(
          'This reset link is invalid or has expired. Request a new one from the sign-in page.',
          400,
          'INVALID_RESET_TOKEN',
        );
      }

      const user = await authRepo.findById(row.userId);
      if (!user?.passwordHash) {
        throw new AppError(
          'This reset link is invalid or has expired. Request a new one from the sign-in page.',
          400,
          'INVALID_RESET_TOKEN',
        );
      }

      const newHash = await hashPassword(newPassword);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: row.userId },
          data: { passwordHash: newHash },
        });
        await tx.passwordResetToken.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.updateMany({
          where: { userId: row.userId, usedAt: null, id: { not: row.id } },
          data: { usedAt: new Date() },
        });
        await tx.trustedDevice.deleteMany({ where: { userId: row.userId } });
        await tx.emailLoginChallenge.updateMany({
          where: { userId: row.userId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
      });

      await auditService?.log({
        userId: row.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        resourceType: 'User',
        resourceId: row.userId,
      });
    },
  };
}
