/**
 * Opportunity listing and verification workflow — placeholder.
 */
import { OpportunityStatus, type PrismaClient } from '@prisma/client';

export interface OpportunityRepository {
  listVerified(): Promise<unknown[]>;
}

export function createOpportunityRepository(prisma: PrismaClient): OpportunityRepository {
  return {
    async listVerified() {
      return prisma.opportunity.findMany({ where: { status: OpportunityStatus.VERIFIED } });
    },
  };
}
