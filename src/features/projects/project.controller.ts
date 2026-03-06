/**
 * Project controller — HTTP handlers for ventures.
 */
import type { Request, Response } from 'express';
import type { ProjectService } from './project.service';
import type { AuthenticatedRequest } from '../../core/types';

export function createProjectController(projectService: ProjectService) {
  return {
    async list(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const projects = await projectService.listByOwner(user.userId);
      res.json({ projects });
    },

    async create(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const project = await projectService.create(user.userId, req.body);
      res.status(201).json({ project });
    },

    async getById(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      const project = await projectService.getById(id, user.userId);
      res.json({ project });
    },

    async update(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      const project = await projectService.update(id, user.userId, req.body);
      res.json({ project });
    },

    async delete(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      await projectService.delete(id, user.userId);
      res.status(204).send();
    },
  };
}
