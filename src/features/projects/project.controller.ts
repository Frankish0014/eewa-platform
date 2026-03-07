/**
 * Project controller — HTTP handlers for ventures.
 */
import type { Request, Response } from 'express';
import type { ProjectService } from './project.service';
import type { AuthenticatedRequest } from '../../core/types';
import type { AuditService } from '../../features/audit/audit.service';

export function createProjectController(projectService: ProjectService, auditService?: AuditService) {
  return {
    async list(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const projects = await projectService.listByOwner(user.userId);
      res.json({ projects });
    },

    async create(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const project = await projectService.create(user.userId, req.body);
      await auditService?.log({
        userId: user.userId,
        action: 'PROJECT_CREATE',
        resourceType: 'Project',
        resourceId: project.id,
      });
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
      await auditService?.log({
        userId: user.userId,
        action: 'PROJECT_EDIT',
        resourceType: 'Project',
        resourceId: id,
      });
      res.json({ project });
    },

    async delete(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      await projectService.delete(id, user.userId);
      await auditService?.log({
        userId: user.userId,
        action: 'PROJECT_DELETE',
        resourceType: 'Project',
        resourceId: id,
      });
      res.status(204).send();
    },
  };
}
