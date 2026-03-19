/**
 * Notification persistence — create, list, mark read.
 */
import type { PrismaClient } from '@prisma/client';

export interface NotificationRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export function createNotificationRepository(prisma: PrismaClient) {
  return {
    async create(data: {
      userId: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }): Promise<NotificationRow> {
      const n = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          link: data.link,
        },
      });
      return {
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      };
    },

    async listByUserId(userId: string, unreadOnly?: boolean): Promise<NotificationRow[]> {
      const where: { userId: string; readAt?: null } = { userId };
      if (unreadOnly) where.readAt = null;
      const list = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return list.map((n) => ({
        id: n.id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      }));
    },

    async markRead(id: string, userId: string): Promise<void> {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { readAt: new Date() },
      });
    },

    async markAllRead(userId: string): Promise<void> {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    },
  };
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
