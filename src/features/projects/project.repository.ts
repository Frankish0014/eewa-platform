/**
 * Project data access — placeholder for Project CRUD and milestones.
 */
import type { PrismaClient } from '@prisma/client';

export interface ProjectRepository {
  // To be implemented with Project + Milestone entities
}

export function createProjectRepository(_prisma: PrismaClient): ProjectRepository {
  return {};
}
