/**
 * Profile service — fetch and update current user profile.
 */
import type { PrismaClient } from '@prisma/client';

export interface Profile {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  skills: string | null;
  institutionName?: string;
  institutionCountry?: string;
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  skills?: string | null;
}

export function createProfileService(prisma: PrismaClient) {
  return {
    async getProfile(userId: string): Promise<Profile | null> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          skills: true,
          createdAt: true,
          institution: { select: { name: true, country: true } },
        },
      });
      if (!user) return null;
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        skills: user.skills ?? null,
        ...(user.institution && {
          institutionName: user.institution.name,
          institutionCountry: user.institution.country,
        }),
        createdAt: user.createdAt.toISOString(),
      };
    },

    async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
      const data: { firstName?: string; lastName?: string; skills?: string | null } = {};
      if (input.firstName !== undefined && input.firstName !== '') data.firstName = input.firstName;
      if (input.lastName !== undefined && input.lastName !== '') data.lastName = input.lastName;
      if (input.skills !== undefined) data.skills = input.skills;

      if (Object.keys(data).length === 0) {
        const existing = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
            skills: true,
            createdAt: true,
            institution: { select: { name: true, country: true } },
          },
        });
        if (!existing) throw new Error('User not found');
        return {
          userId: existing.id,
          email: existing.email,
          role: existing.role,
          firstName: existing.firstName,
          lastName: existing.lastName,
          skills: existing.skills ?? null,
          ...(existing.institution && {
            institutionName: existing.institution.name,
            institutionCountry: existing.institution.country,
          }),
          createdAt: existing.createdAt.toISOString(),
        };
      }
      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          skills: true,
          createdAt: true,
          institution: { select: { name: true, country: true } },
        },
      });
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        skills: user.skills ?? null,
        ...(user.institution && {
          institutionName: user.institution.name,
          institutionCountry: user.institution.country,
        }),
        createdAt: user.createdAt.toISOString(),
      };
    },
  };
}
