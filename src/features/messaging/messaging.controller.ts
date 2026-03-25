/**
 * Messaging HTTP handlers — mentor ↔ student (active assignment).
 */
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../core/types';
import type { MessagingService } from './messaging.service';

function user(req: Request): AuthenticatedRequest {
  return (req as Request & { user?: AuthenticatedRequest }).user!;
}

export function createMessagingController(service: MessagingService) {
  return {
    async listEligiblePeers(req: Request, res: Response): Promise<void> {
      const u = user(req);
      const peers = await service.listEligiblePeers(u.userId);
      res.json({ peers });
    },

    async listConversations(req: Request, res: Response): Promise<void> {
      const u = user(req);
      const list = await service.listConversations(u.userId);
      res.json({ conversations: list });
    },

    async openConversation(req: Request, res: Response): Promise<void> {
      const u = user(req);
      const { peerUserId } = req.body as { peerUserId: string };
      const result = await service.openOrGetConversation(u.userId, peerUserId);
      res.json(result);
    },

    async listMessages(req: Request, res: Response): Promise<void> {
      const u = user(req);
      const { id } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const before = typeof req.query.before === 'string' ? req.query.before : undefined;
      const messages = await service.listMessages(u.userId, id, limit, before);
      res.json({ messages });
    },

    async sendMessage(req: Request, res: Response): Promise<void> {
      const u = user(req);
      const { id } = req.params;
      const { body } = req.body as { body: string };
      const msg = await service.sendMessage(u.userId, id, body);
      res.status(201).json({ message: msg });
    },
  };
}

export type MessagingController = ReturnType<typeof createMessagingController>;
