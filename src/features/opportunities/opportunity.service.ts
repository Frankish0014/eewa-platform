/**
 * Opportunity service — create, list verified, admin verify/reject.
 */
import type { OpportunityDto, CreateOpportunityData } from './opportunity.repository';
import type { OpportunityRepository } from './opportunity.repository';
import { NotFoundError } from '../../core/errors';

export type OpportunityService = ReturnType<typeof createOpportunityService>;

export function createOpportunityService(repo: OpportunityRepository) {
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

    async verify(id: string, adminId: string, approve: boolean): Promise<OpportunityDto> {
      return repo.verify(id, adminId, approve);
    },
  };
}
