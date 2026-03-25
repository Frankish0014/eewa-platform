/**
 * Messaging data access — direct conversations between mentor and mentee (ACTIVE assignment only).
 */
import type { PrismaClient } from '@prisma/client';

export function createMessagingRepository(prisma: PrismaClient) {
  return {
    async listActiveMentorshipPeers(userId: string) {
      const asMentee = await prisma.mentorAssignment.findMany({
        where: { menteeId: userId, status: 'ACTIVE' },
        include: {
          mentor: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
          project: { select: { id: true, title: true } },
        },
      });
      const asMentor = await prisma.mentorAssignment.findMany({
        where: { status: 'ACTIVE', mentor: { userId } },
        include: {
          mentee: { select: { id: true, firstName: true, lastName: true, email: true } },
          project: { select: { id: true, title: true } },
        },
      });
      const peers: Array<{
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        projectId: string;
        projectTitle: string;
        assignmentId: string;
      }> = [];
      for (const a of asMentee) {
        const u = a.mentor.user;
        peers.push({
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          projectId: a.project.id,
          projectTitle: a.project.title,
          assignmentId: a.id,
        });
      }
      for (const a of asMentor) {
        const u = a.mentee;
        peers.push({
          userId: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          projectId: a.project.id,
          projectTitle: a.project.title,
          assignmentId: a.id,
        });
      }
      return peers;
    },

    async hasActiveMentorshipBetween(userIdA: string, userIdB: string): Promise<boolean> {
      const row = await prisma.mentorAssignment.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [
            { menteeId: userIdA, mentor: { userId: userIdB } },
            { menteeId: userIdB, mentor: { userId: userIdA } },
          ],
        },
        select: { id: true },
      });
      return !!row;
    },

    async findDirectConversationId(userId1: string, userId2: string): Promise<string | null> {
      const mine = await prisma.conversationParticipant.findMany({
        where: { userId: userId1 },
        select: { conversationId: true },
      });
      for (const { conversationId } of mine) {
        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: { userId: true },
        });
        if (participants.length !== 2) continue;
        const ids = new Set(participants.map((p) => p.userId));
        if (ids.has(userId1) && ids.has(userId2)) return conversationId;
      }
      return null;
    },

    async createDirectConversation(userId1: string, userId2: string): Promise<string> {
      const conv = await prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: userId1 }, { userId: userId2 }],
          },
        },
        select: { id: true },
      });
      return conv.id;
    },

    async isParticipant(conversationId: string, userId: string): Promise<boolean> {
      const p = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { id: true },
      });
      return !!p;
    },

    async getOtherParticipantUserId(conversationId: string, userId: string): Promise<string | null> {
      const others = await prisma.conversationParticipant.findMany({
        where: { conversationId, NOT: { userId } },
        select: { userId: true },
        take: 1,
      });
      return others[0]?.userId ?? null;
    },

    async listConversationsForUser(userId: string) {
      return prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        orderBy: { updatedAt: 'desc' },
        include: {
          participants: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, senderId: true, createdAt: true, bodyEnc: true },
          },
        },
      });
    },

    async listMessages(conversationId: string, take: number, before?: Date) {
      return prisma.message.findMany({
        where: {
          conversationId,
          ...(before ? { createdAt: { lt: before } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    },

    async countUnreadForReceiver(conversationId: string, receiverId: string): Promise<number> {
      return prisma.message.count({
        where: { conversationId, receiverId, readAt: null },
      });
    },

    async createMessage(input: {
      conversationId: string;
      senderId: string;
      receiverId: string;
      bodyEnc: string;
    }) {
      const msg = await prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: input.senderId,
          receiverId: input.receiverId,
          bodyEnc: input.bodyEnc,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      });
      return msg;
    },

    async markMessagesRead(conversationId: string, readerId: string): Promise<void> {
      await prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: readerId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    },
  };
}

export type MessagingRepository = ReturnType<typeof createMessagingRepository>;
