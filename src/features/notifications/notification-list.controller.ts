/**
 * In-app notifications — list from DB, mark read.
 */
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../core/types';
import type { NotificationListService } from './notification-list.service';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export function createNotificationListController(service: NotificationListService) {
  return {
    async getNotifications(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user;
      if (!user) {
        res.json({ notifications: [] });
        return;
      }
      try {
        const list = await service.listForUser(user.userId);
        const notifications: NotificationItem[] = list.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          readAt: n.readAt,
          createdAt: n.createdAt,
        }));
        res.json({ notifications });
      } catch (err) {
        console.error('Notifications list failed:', err);
        res.json({ notifications: [] });
      }
    },

    async markRead(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      const { id } = req.params;
      await service.markRead(id, user.userId);
      res.status(204).send();
    },

    async markAllRead(req: Request, res: Response): Promise<void> {
      const user = (req as Request & { user?: AuthenticatedRequest }).user!;
      await service.markAllRead(user.userId);
      res.status(204).send();
    },
  };
}

export type NotificationListController = ReturnType<typeof createNotificationListController>;
