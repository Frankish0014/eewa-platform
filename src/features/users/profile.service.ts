/**
 * Profile service — fetch and update current user profile.
 */
import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import type { AuditService } from '../audit/audit.service';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../core/errors';
import { config } from '../../config';

export interface Profile {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  skills: string | null;
  emailSignInOtpEnabled: boolean;
  /** Deployment-wide: when false, sign-in email codes are not sent (login ignores OTP until this is true). */
  emailSignInOtpServerEnabled: boolean;
  institutionName?: string;
  institutionCountry?: string;
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  skills?: string | null;
  emailSignInOtpEnabled?: boolean;
  currentPassword?: string;
}

function toProfile(user: {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  skills: string | null;
  emailSignInOtpEnabled: boolean;
  createdAt: Date;
  institution: { name: string; country: string } | null;
}): Profile {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    skills: user.skills ?? null,
    emailSignInOtpEnabled: user.emailSignInOtpEnabled,
    emailSignInOtpServerEnabled: config.EMAIL_SIGN_IN_OTP_ENABLED,
    ...(user.institution && {
      institutionName: user.institution.name,
      institutionCountry: user.institution.country,
    }),
    createdAt: user.createdAt.toISOString(),
  };
}

const profileSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  skills: true,
  emailSignInOtpEnabled: true,
  createdAt: true,
  institution: { select: { name: true, country: true } },
} as const;

export function createProfileService(prisma: PrismaClient, auditService?: AuditService) {
  return {
    async getProfile(userId: string): Promise<Profile | null> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: profileSelect,
      });
      if (!user) return null;
      return toProfile(user);
    },

    async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
      const data: {
        firstName?: string;
        lastName?: string;
        skills?: string | null;
        emailSignInOtpEnabled?: boolean;
      } = {};

      if (input.firstName !== undefined && input.firstName !== '') data.firstName = input.firstName;
      if (input.lastName !== undefined && input.lastName !== '') data.lastName = input.lastName;
      if (input.skills !== undefined) data.skills = input.skills;

      if (input.emailSignInOtpEnabled !== undefined) {
        if (input.emailSignInOtpEnabled) {
          const plain = input.currentPassword?.trim() ?? '';
          if (!plain) {
            throw new UnauthorizedError('Current password is required to turn on email sign-in codes');
          }
          const row = await prisma.user.findUnique({
            where: { id: userId },
            select: { passwordHash: true, emailSignInOtpEnabled: true },
          });
          if (!row?.passwordHash || !(await bcrypt.compare(plain, row.passwordHash))) {
            throw new UnauthorizedError('Incorrect password');
          }
          // New sign-in policy: existing “trusted” browsers must prove email once too.
          if (!row.emailSignInOtpEnabled) {
            await prisma.trustedDevice.deleteMany({ where: { userId } });
          }
        }
        data.emailSignInOtpEnabled = input.emailSignInOtpEnabled;
        await auditService?.log({
          userId,
          action: 'EMAIL_SIGN_IN_OTP_SETTING',
          resourceType: 'User',
          resourceId: userId,
          metadata: { enabled: input.emailSignInOtpEnabled },
        });
      }

      if (Object.keys(data).length === 0) {
        const existing = await prisma.user.findUnique({
          where: { id: userId },
          select: profileSelect,
        });
        if (!existing) throw new NotFoundError('User');
        return toProfile(existing);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: profileSelect,
      });
      return toProfile(user);
    },

    /** Irreversible: verify password, block sole admin, remove user and cascaded data. */
    async deleteAccount(userId: string, password: string): Promise<void> {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, role: true },
      });
      if (!row) throw new NotFoundError('User');
      if (!row.passwordHash) {
        throw new ForbiddenError(
          'This account has no password on file and cannot be deleted in the app. Contact support if you need it removed.',
        );
      }
      const ok = await bcrypt.compare(password.trim(), row.passwordHash);
      if (!ok) throw new ForbiddenError('Incorrect password');

      if (row.role === 'Admin') {
        const adminCount = await prisma.user.count({ where: { role: 'Admin' } });
        if (adminCount <= 1) {
          throw new ConflictError('Cannot delete the only administrator. Promote another admin first.');
        }
      }

      await prisma.opportunity.updateMany({
        where: { verifiedById: userId },
        data: { verifiedById: null, verifiedAt: null },
      });

      await auditService?.log({
        userId,
        action: 'ACCOUNT_DELETE',
        resourceType: 'User',
        resourceId: userId,
        metadata: { role: row.role },
      });

      await prisma.user.delete({ where: { id: userId } });
    },
  };
}
