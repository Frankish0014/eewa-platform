/**
 * Milestone controller — HTTP handlers for project milestones.
 */
import type { Request, Response } from 'express';
import type { MilestoneService } from './milestone.service';
import type { AuthenticatedRequest } from '../../core/types';

export function createMilestoneController(milestoneService: MilestoneService) {
  return {
    async list(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId } = req.params;
      const milestones = await milestoneService.listByProject(projectId, user.userId);
      res.json({ milestones });
    },

    async create(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId } = req.params;
      const milestone = await milestoneService.create(projectId, user.userId, req.body);
      res.status(201).json({ milestone });
    },

    async getById(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId, milestoneId } = req.params;
      const milestone = await milestoneService.getById(projectId, milestoneId, user.userId);
      res.json({ milestone });
    },

    async update(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId, milestoneId } = req.params;
      const milestone = await milestoneService.update(projectId, milestoneId, user.userId, req.body);
      res.json({ milestone });
    },

    async delete(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId, milestoneId } = req.params;
      await milestoneService.delete(projectId, milestoneId, user.userId);
      res.status(204).send();
    },

    async getProgress(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id: projectId } = req.params;
      const progress = await milestoneService.getProgress(projectId, user.userId);
      res.json({ progress });
    },
  };
}
