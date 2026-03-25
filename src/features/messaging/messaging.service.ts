/**
 * Messaging — mentor ↔ student only when MentorAssignment status is ACTIVE.
 */
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors';
import { encryptMessageBody, decryptMessageBody } from './message-crypto';
import type { MessagingRepository } from './messaging.repository';
import type { NotificationListService } from '../notifications/notification-list.service';

export interface ConversationSummaryDto {
  id: string;
  peer: { id: string; firstName: string; lastName: string; email: string };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function createMessagingService(
  repo: MessagingRepository,
  notificationListService: NotificationListService
) {
  return {
    async listEligiblePeers(userId: string) {
      const raw = await repo.listActiveMentorshipPeers(userId);
      const byUser = new Map<
        string,
        {
          userId: string;
          firstName: string;
          lastName: string;
          email: string;
          projectId: string;
          projectTitle: string;
          assignmentId: string;
        }
      >();
      for (const p of raw) {
        const cur = byUser.get(p.userId);
        if (!cur) {
          byUser.set(p.userId, { ...p });
        } else {
          cur.projectTitle =
            cur.projectTitle.includes(p.projectTitle) ? cur.projectTitle : `${cur.projectTitle}; ${p.projectTitle}`;
        }
      }
      return [...byUser.values()];
    },

    async listConversations(userId: string): Promise<ConversationSummaryDto[]> {
      const rows = await repo.listConversationsForUser(userId);
      const out: ConversationSummaryDto[] = [];
      for (const c of rows) {
        const peerParticipant = c.participants.find((p) => p.userId !== userId);
        if (!peerParticipant) continue;
        const u = peerParticipant.user;
        const last = c.messages[0];
        let preview: string | null = null;
        if (last) {
          try {
            const plain = decryptMessageBody(last.bodyEnc);
            preview = plain.length > 120 ? `${plain.slice(0, 117)}…` : plain;
          } catch {
            preview = '(unable to decrypt)';
          }
        }
        const unreadCount = await repo.countUnreadForReceiver(c.id, userId);
        out.push({
          id: c.id,
          peer: {
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
          },
          lastMessagePreview: preview,
          lastMessageAt: last?.createdAt.toISOString() ?? null,
          unreadCount,
        });
      }
      return out;
    },

    async openOrGetConversation(userId: string, peerUserId: string): Promise<{ conversationId: string }> {
      if (userId === peerUserId) {
        throw new ForbiddenError('Cannot message yourself');
      }
      const allowed = await repo.hasActiveMentorshipBetween(userId, peerUserId);
      if (!allowed) {
        throw new ForbiddenError('Messaging is only available for active mentorship pairs');
      }
      let cid = await repo.findDirectConversationId(userId, peerUserId);
      if (!cid) {
        cid = await repo.createDirectConversation(userId, peerUserId);
      }
      return { conversationId: cid };
    },

    async listMessages(userId: string, conversationId: string, limit = 50, beforeIso?: string): Promise<MessageDto[]> {
      const ok = await repo.isParticipant(conversationId, userId);
      if (!ok) throw new NotFoundError('Conversation');
      const before = beforeIso ? new Date(beforeIso) : undefined;
      if (before && Number.isNaN(before.getTime())) {
        throw new ValidationError('Invalid before cursor');
      }
      const rows = await repo.listMessages(conversationId, Math.min(limit, 100), before);
      await repo.markMessagesRead(conversationId, userId);
      return rows.reverse().map((m) => {
        let body = '';
        try {
          body = decryptMessageBody(m.bodyEnc);
        } catch {
          body = '(unable to decrypt message)';
        }
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
          body,
          readAt: m.readAt ? m.readAt.toISOString() : null,
          createdAt: m.createdAt.toISOString(),
        };
      });
    },

    async sendMessage(userId: string, conversationId: string, body: string): Promise<MessageDto> {
      const ok = await repo.isParticipant(conversationId, userId);
      if (!ok) throw new NotFoundError('Conversation');
      const receiverId = await repo.getOtherParticipantUserId(conversationId, userId);
      if (!receiverId) throw new NotFoundError('Conversation');
      const allowed = await repo.hasActiveMentorshipBetween(userId, receiverId);
      if (!allowed) {
        throw new ForbiddenError('Messaging is only available for active mentorship pairs');
      }
      const bodyEnc = encryptMessageBody(body);
      const m = await repo.createMessage({
        conversationId,
        senderId: userId,
        receiverId,
        bodyEnc,
      });
      const senderName = `${m.sender.firstName} ${m.sender.lastName}`.trim() || 'Someone';
      try {
        await notificationListService.createForNewMessage(
          receiverId,
          senderName,
          body,
          conversationId
        );
      } catch {
        // Do not fail message send if notification creation fails
      }
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName,
        body,
        readAt: null,
        createdAt: m.createdAt.toISOString(),
      };
    },
  };
}

export type MessagingService = ReturnType<typeof createMessagingService>;
