/**
 * Mentor controller — profile, list by sector, request/respond.
 */
import type { Request, Response } from 'express';
import type { MentorService } from './mentor.service';
import type { AuthenticatedRequest } from '../../core/types';
import type { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../core/errors';

export function createMentorController(mentorService: MentorService, auditService?: AuditService) {
  return {
    async getMyProfile(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const profile = await mentorService.getMyProfile(user.userId);
      if (!profile) {
        res.status(404).json({ error: 'Mentor profile not found' });
        return;
      }
      res.json({ profile });
    },

    async updateMyProfile(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const profile = await mentorService.upsertMyProfile(user.userId, req.body);
      res.json({ profile });
    },

    async listBySector(req: Request, res: Response): Promise<void> {
      const sectorId = (req.query.sectorId as string) || '';
      if (!sectorId) {
        res.status(400).json({ error: 'sectorId query required' });
        return;
      }
      const mentors = await mentorService.listBySector(sectorId);
      res.json({ mentors });
    },

    async requestMentor(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId } = req.params;
      const { mentorId } = req.body as { mentorId: string };
      const result = await mentorService.requestMentor(projectId, user.userId, mentorId);
      res.status(201).json(result);
    },

    async listMyRequests(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const profile = await mentorService.getMyProfile(user.userId);
      if (!profile) throw new NotFoundError('Mentor profile');
      const requests = await mentorService.listMyRequests(profile.id);
      res.json({ requests });
    },

    async respondToRequest(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const profile = await mentorService.getMyProfile(user.userId);
      if (!profile) throw new NotFoundError('Mentor profile');
      const { assignmentId } = req.params;
      const { accept } = req.body as { accept: boolean };
      await mentorService.respondToRequest(assignmentId, profile.id, accept);
      await auditService?.log({
        userId: user.userId,
        action: accept ? 'MENTOR_ASSIGN' : 'MENTOR_UNASSIGN',
        resourceType: 'MentorAssignment',
        resourceId: assignmentId,
        metadata: { accept },
      });
      res.status(204).send();
    },
  };
}
