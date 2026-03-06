/**
 * Auth data access — user lookup and password verification.
 */
import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export interface UserForAuth {
  id: string;
  email: string;
  role: string;
  passwordHash: string | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserForAuth | null>;
  findById(id: string): Promise<UserForAuth | null>;
  createUser(input: CreateUserInput): Promise<UserForAuth>;
  verifyPassword(userId: string, plainPassword: string): Promise<boolean>;
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findByEmail(email: string) {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, role: true, passwordHash: true },
      });
      return user;
    },

    async findById(id: string) {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, passwordHash: true },
      });
      return user;
    },

    async createUser(input: CreateUserInput) {
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role as 'Student' | 'Mentor' | 'Admin' | 'InstitutionStaff' | 'OpportunityProvider',
        },
        select: { id: true, email: true, role: true, passwordHash: true },
      });
      return user;
    },

    async verifyPassword(userId: string, plainPassword: string): Promise<boolean> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });
      if (!user?.passwordHash) return false;
      return bcrypt.compare(plainPassword, user.passwordHash);
    },
  };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}
