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
  createdAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
}

export function createProfileService(prisma: PrismaClient) {
  return {
    async getProfile(userId: string): Promise<Profile | null> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true },
      });
      if (!user) return null;
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
      };
    },

    async updateProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.firstName !== undefined && { firstName: input.firstName }),
          ...(input.lastName !== undefined && { lastName: input.lastName }),
        },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true },
      });
      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
      };
    },
  };
}
