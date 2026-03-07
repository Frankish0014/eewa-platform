/**
 * Milestone data access — CRUD per project (owner-only).
 */
import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../core/errors';

export interface MilestoneCreateData {
  title: string;
  description?: string;
  dueDate?: Date;
  orderIndex?: number;
}

export interface MilestoneUpdateData {
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  orderIndex?: number;
}

export interface MilestoneWithProject {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  project: { ownerId: string };
}

export interface MilestoneRepository {
  create(projectId: string, ownerId: string, data: MilestoneCreateData): Promise<MilestoneWithProject>;
  findManyByProject(projectId: string, ownerId: string): Promise<MilestoneWithProject[]>;
  findById(milestoneId: string, projectId: string, ownerId: string): Promise<MilestoneWithProject | null>;
  update(milestoneId: string, projectId: string, ownerId: string, data: MilestoneUpdateData): Promise<MilestoneWithProject>;
  delete(milestoneId: string, projectId: string, ownerId: string): Promise<void>;
  countCompletedByProject(projectId: string): Promise<number>;
  countByProject(projectId: string): Promise<number>;
  getProgress(projectId: string, ownerId: string): Promise<{ total: number; completed: number }>;
}

export function createMilestoneRepository(prisma: PrismaClient): MilestoneRepository {
  async function ensureProjectOwner(projectId: string, ownerId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
    if (!project) throw new NotFoundError('Project');
    if (project.ownerId !== ownerId) throw new ForbiddenError('You can only access your own project milestones');
  }

  return {
    async create(projectId, ownerId, data) {
      await ensureProjectOwner(projectId, ownerId);
      const orderIndex = data.orderIndex ?? 0;
      const milestone = await prisma.milestone.create({
        data: {
          projectId,
          title: data.title,
          description: data.description ?? null,
          dueDate: data.dueDate ?? null,
          orderIndex,
        },
        include: { project: { select: { ownerId: true } } },
      });
      return milestone as MilestoneWithProject;
    },

    async findManyByProject(projectId, ownerId) {
      await ensureProjectOwner(projectId, ownerId);
      const list = await prisma.milestone.findMany({
        where: { projectId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        include: { project: { select: { ownerId: true } } },
      });
      return list as MilestoneWithProject[];
    },

    async findById(milestoneId, projectId, ownerId) {
      await ensureProjectOwner(projectId, ownerId);
      const m = await prisma.milestone.findFirst({
        where: { id: milestoneId, projectId },
        include: { project: { select: { ownerId: true } } },
      });
      return m as MilestoneWithProject | null;
    },

    async update(milestoneId, projectId, ownerId, data) {
      await ensureProjectOwner(projectId, ownerId);
      const updatePayload: Record<string, unknown> = {};
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.description !== undefined) updatePayload.description = data.description ?? null;
      if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate ?? null;
      if (data.completedAt !== undefined) updatePayload.completedAt = data.completedAt ?? null;
      if (data.orderIndex !== undefined) updatePayload.orderIndex = data.orderIndex;

      const updated = await prisma.milestone.updateMany({
        where: { id: milestoneId, projectId },
        data: updatePayload,
      });
      if (updated.count === 0) throw new NotFoundError('Milestone');
      const m = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { project: { select: { ownerId: true } } },
      });
      return m as MilestoneWithProject;
    },

    async delete(milestoneId, projectId, ownerId) {
      await ensureProjectOwner(projectId, ownerId);
      const result = await prisma.milestone.deleteMany({
        where: { id: milestoneId, projectId },
      });
      if (result.count === 0) throw new NotFoundError('Milestone');
    },

    async countCompletedByProject(projectId) {
      return prisma.milestone.count({
        where: { projectId, completedAt: { not: null } },
      });
    },

    async countByProject(projectId) {
      return prisma.milestone.count({ where: { projectId } });
    },

    async getProgress(projectId: string, ownerId: string): Promise<{ total: number; completed: number }> {
      await ensureProjectOwner(projectId, ownerId);
      const [total, completed] = await Promise.all([
        prisma.milestone.count({ where: { projectId } }),
        prisma.milestone.count({ where: { projectId, completedAt: { not: null } } }),
      ]);
      return { total, completed };
    },
  };
}
