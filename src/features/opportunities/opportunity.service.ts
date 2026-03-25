/**
 * Opportunity service — create, list verified, admin verify/reject, student apply.
 */
import { OpportunityStatus, Prisma } from '@prisma/client';
import type { OpportunityDto, CreateOpportunityData, UpdateOpportunityData, OpportunityRepository } from './opportunity.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../core/errors';

export type OpportunityService = ReturnType<typeof createOpportunityService>;

export function createOpportunityService(
  repo: OpportunityRepository,
  options?: {
    onOpportunityVerified?: (opp: OpportunityDto) => Promise<void>;
  }
) {
  return {
    async create(providerId: string, data: CreateOpportunityData): Promise<OpportunityDto> {
      return repo.create(providerId, data);
    },

    async listVerified(sectorId?: string): Promise<OpportunityDto[]> {
      return repo.listVerified(sectorId);
    },

    async listPending(): Promise<OpportunityDto[]> {
      return repo.listPending();
    },

    async listByProvider(providerId: string): Promise<OpportunityDto[]> {
      return repo.listByProvider(providerId);
    },

    async getById(id: string): Promise<OpportunityDto> {
      const o = await repo.findById(id);
      if (!o) throw new NotFoundError('Opportunity');
      return o;
    },

    async updateByProvider(id: string, providerId: string, data: UpdateOpportunityData): Promise<OpportunityDto> {
      return repo.updateByProvider(id, providerId, data);
    },

    async verify(id: string, adminId: string, approve: boolean): Promise<OpportunityDto> {
      const dto = await repo.verify(id, adminId, approve);
      if (approve && dto.status === OpportunityStatus.VERIFIED && options?.onOpportunityVerified) {
        await options.onOpportunityVerified(dto);
      }
      return dto;
    },

    async apply(
      opportunityId: string,
      studentId: string,
      studentRole: string,
      body: {
        primaryProjectId?: string;
        message?: string;
        eligibilityAcknowledged?: boolean;
      }
    ) {
      if (studentRole !== 'Student') {
        throw new ForbiddenError('Only students can apply to opportunities');
      }
      const opp = await repo.findById(opportunityId);
      if (!opp) throw new NotFoundError('Opportunity');
      if (opp.status !== 'VERIFIED') {
        throw new ForbiddenError('This opportunity is not open for applications');
      }

      const existing = await repo.findApplication(opportunityId, studentId);
      if (existing) {
        throw new ConflictError('You have already applied to this opportunity');
      }

      const project = await repo.resolveApplyProject(studentId, opp.sectorId, body.primaryProjectId ?? null);
      if (!project) {
        throw new ForbiddenError(
          'You need a venture in this opportunity’s sector to apply. Create or select a matching project.'
        );
      }

      if (opp.requireCompletedMilestone) {
        const ok = await repo.projectHasCompletedMilestone(project.id);
        if (!ok) {
          throw new ForbiddenError('This opportunity requires at least one completed milestone on your venture in this sector.');
        }
      }

      const criteria = opp.eligibilityCriteria?.trim();
      if (criteria && !body.eligibilityAcknowledged) {
        throw new ForbiddenError('Please confirm you meet the eligibility criteria listed for this opportunity.');
      }

      try {
        return await repo.createApplication({
          opportunityId,
          studentId,
          primaryProjectId: project.id,
          message: body.message,
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictError('You have already applied to this opportunity');
        }
        throw e;
      }
    },
  };
}
