/**
 * Opportunity controller — create (provider), list verified, admin verify.
 */
import type { Request, Response } from 'express';
import type { OpportunityService } from './opportunity.service';
import type { AuthenticatedRequest } from '../../core/types';
import type { AuditService } from '../audit/audit.service';

export function createOpportunityController(opportunityService: OpportunityService, auditService?: AuditService) {
  return {
    async create(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const opp = await opportunityService.create(user.userId, req.body);
      res.status(201).json({ opportunity: opp });
    },

    async listVerified(req: Request, res: Response): Promise<void> {
      const sectorId = typeof req.query.sectorId === 'string' ? req.query.sectorId : undefined;
      const list = await opportunityService.listVerified(sectorId);
      res.json({ opportunities: list });
    },

    async listPending(_req: Request, res: Response): Promise<void> {
      const list = await opportunityService.listPending();
      res.json({ opportunities: list });
    },

    async listMine(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const list = await opportunityService.listByProvider(user.userId);
      res.json({ opportunities: list });
    },

    async getById(req: Request, res: Response): Promise<void> {
      const { id } = req.params;
      const opp = await opportunityService.getById(id);
      res.json({ opportunity: opp });
    },

    async verify(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      const { approve } = req.body as { approve: boolean };
      const opp = await opportunityService.verify(id, user.userId, approve);
      await auditService?.log({
        userId: user.userId,
        action: approve ? 'OPPORTUNITY_APPROVE' : 'OPPORTUNITY_REJECT',
        resourceType: 'Opportunity',
        resourceId: id,
        metadata: { approve },
      });
      res.json({ opportunity: opp });
    },
  };
}
