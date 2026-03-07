/**
 * Milestone business logic — track progress per project.
 */
import type { MilestoneRepository, MilestoneWithProject, MilestoneCreateData, MilestoneUpdateData } from './milestone.repository';
import { NotFoundError } from '../../core/errors';

export interface MilestoneDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneService = ReturnType<typeof createMilestoneService>;

function toDto(m: MilestoneWithProject): MilestoneDto {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    description: m.description ?? null,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    orderIndex: m.orderIndex,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function parseDate(s: string | undefined | null): Date | null {
  if (s == null || s === '') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function createMilestoneService(repo: MilestoneRepository) {
  return {
    async create(projectId: string, ownerId: string, data: { title: string; description?: string; dueDate?: string; orderIndex?: number }): Promise<MilestoneDto> {
      const createData: MilestoneCreateData = {
        title: data.title,
        description: data.description,
        dueDate: parseDate(data.dueDate) ?? undefined,
        orderIndex: data.orderIndex,
      };
      const milestone = await repo.create(projectId, ownerId, createData);
      return toDto(milestone);
    },

    async listByProject(projectId: string, ownerId: string): Promise<MilestoneDto[]> {
      const list = await repo.findManyByProject(projectId, ownerId);
      return list.map(toDto);
    },

    async getById(projectId: string, milestoneId: string, ownerId: string): Promise<MilestoneDto> {
      const m = await repo.findById(milestoneId, projectId, ownerId);
      if (!m) throw new NotFoundError('Milestone');
      return toDto(m);
    },

    async update(
      projectId: string,
      milestoneId: string,
      ownerId: string,
      data: { title?: string; description?: string | null; dueDate?: string | null; completedAt?: string | null; orderIndex?: number }
    ): Promise<MilestoneDto> {
      const updateData: MilestoneUpdateData = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: parseDate(data.dueDate) }),
        ...(data.completedAt !== undefined && { completedAt: parseDate(data.completedAt) }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      };
      const m = await repo.update(milestoneId, projectId, ownerId, updateData);
      return toDto(m);
    },

    async delete(projectId: string, milestoneId: string, ownerId: string): Promise<void> {
      await repo.delete(milestoneId, projectId, ownerId);
    },

    async getProgress(projectId: string, ownerId: string): Promise<{ total: number; completed: number; percentage: number }> {
      const { total, completed } = await repo.getProgress(projectId, ownerId);
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { total, completed, percentage };
    },
  };
}
