/**
 * Opportunity CRUD, verification, and student applications.
 */
import { OpportunityStatus, type PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../core/errors';

export interface OpportunityDto {
  id: string;
  providerId: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string | null;
  link: string | null;
  eligibilityCriteria: string | null;
  requireCompletedMilestone: boolean;
  status: OpportunityStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityData {
  sectorId: string;
  title: string;
  description?: string;
  link?: string;
  eligibilityCriteria?: string;
  requireCompletedMilestone?: boolean;
}

export interface UpdateOpportunityData {
  sectorId?: string;
  title?: string;
  description?: string;
  link?: string;
  eligibilityCriteria?: string;
  requireCompletedMilestone?: boolean;
}

export interface OpportunityApplicationDto {
  id: string;
  opportunityId: string;
  studentId: string;
  primaryProjectId: string | null;
  message: string | null;
  createdAt: string;
}

export function createOpportunityRepository(prisma: PrismaClient) {
  return {
    async create(providerId: string, data: CreateOpportunityData): Promise<OpportunityDto> {
      const opp = await prisma.opportunity.create({
        data: {
          providerId,
          sectorId: data.sectorId,
          title: data.title,
          description: data.description ?? null,
          link: data.link ?? null,
          eligibilityCriteria: data.eligibilityCriteria?.trim() ? data.eligibilityCriteria.trim() : null,
          requireCompletedMilestone: data.requireCompletedMilestone ?? false,
          status: OpportunityStatus.PENDING,
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return toDto(opp);
    },

    async listVerified(sectorId?: string): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: {
          status: OpportunityStatus.VERIFIED,
          ...(sectorId ? { sectorId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async listPending(): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: { status: OpportunityStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async listByProvider(providerId: string): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async findById(id: string): Promise<OpportunityDto | null> {
      const o = await prisma.opportunity.findUnique({
        where: { id },
        include: { sector: { select: { id: true, name: true } } },
      });
      return o ? toDto(o) : null;
    },

    async updateByProvider(id: string, providerId: string, data: UpdateOpportunityData): Promise<OpportunityDto> {
      const o = await prisma.opportunity.findUnique({ where: { id } });
      if (!o) throw new NotFoundError('Opportunity');
      if (o.providerId !== providerId) throw new ForbiddenError('Not the opportunity provider');
      const updated = await prisma.opportunity.update({
        where: { id },
        data: {
          ...(data.sectorId != null && { sectorId: data.sectorId }),
          ...(data.title != null && { title: data.title }),
          ...(data.description !== undefined && { description: data.description || null }),
          ...(data.link !== undefined && { link: data.link || null }),
          ...(data.eligibilityCriteria !== undefined && {
            eligibilityCriteria: data.eligibilityCriteria?.trim() ? data.eligibilityCriteria.trim() : null,
          }),
          ...(data.requireCompletedMilestone !== undefined && {
            requireCompletedMilestone: data.requireCompletedMilestone,
          }),
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return toDto(updated);
    },

    async verify(id: string, adminId: string, approve: boolean): Promise<OpportunityDto> {
      const o = await prisma.opportunity.findUnique({ where: { id } });
      if (!o) throw new NotFoundError('Opportunity');
      if (o.status !== OpportunityStatus.PENDING) throw new ForbiddenError('Opportunity already reviewed');

      const updated = await prisma.opportunity.update({
        where: { id },
        data: {
          status: approve ? OpportunityStatus.VERIFIED : OpportunityStatus.REJECTED,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return toDto(updated);
    },

    async resolveApplyProject(
      studentId: string,
      sectorId: string,
      primaryProjectId?: string | null
    ): Promise<{ id: string } | null> {
      if (primaryProjectId) {
        const p = await prisma.project.findFirst({
          where: { id: primaryProjectId, ownerId: studentId, sectorId },
          select: { id: true },
        });
        return p;
      }
      return prisma.project.findFirst({
        where: { ownerId: studentId, sectorId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });
    },

    async projectHasCompletedMilestone(projectId: string): Promise<boolean> {
      const n = await prisma.milestone.count({
        where: { projectId, completedAt: { not: null } },
      });
      return n > 0;
    },

    async findApplication(opportunityId: string, studentId: string): Promise<OpportunityApplicationDto | null> {
      const row = await prisma.opportunityApplication.findUnique({
        where: { opportunityId_studentId: { opportunityId, studentId } },
      });
      return row ? applicationToDto(row) : null;
    },

    async createApplication(input: {
      opportunityId: string;
      studentId: string;
      primaryProjectId: string | null;
      message?: string | null;
    }): Promise<OpportunityApplicationDto> {
      const row = await prisma.opportunityApplication.create({
        data: {
          opportunityId: input.opportunityId,
          studentId: input.studentId,
          primaryProjectId: input.primaryProjectId,
          message: input.message?.trim() ? input.message.trim() : null,
        },
      });
      return applicationToDto(row);
    },
  };
}

export type OpportunityRepository = ReturnType<typeof createOpportunityRepository>;

function applicationToDto(row: {
  id: string;
  opportunityId: string;
  studentId: string;
  primaryProjectId: string | null;
  message: string | null;
  createdAt: Date;
}): OpportunityApplicationDto {
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    studentId: row.studentId,
    primaryProjectId: row.primaryProjectId,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDto(o: {
  id: string;
  providerId: string;
  sectorId: string;
  title: string;
  description: string | null;
  link: string | null;
  eligibilityCriteria: string | null;
  requireCompletedMilestone: boolean;
  status: OpportunityStatus;
  verifiedById: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sector: { id: string; name: string };
}): OpportunityDto {
  return {
    id: o.id,
    providerId: o.providerId,
    sectorId: o.sectorId,
    sectorName: o.sector.name,
    title: o.title,
    description: o.description,
    link: o.link,
    eligibilityCriteria: o.eligibilityCriteria,
    requireCompletedMilestone: o.requireCompletedMilestone,
    status: o.status,
    verifiedById: o.verifiedById,
    verifiedAt: o.verifiedAt ? o.verifiedAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
