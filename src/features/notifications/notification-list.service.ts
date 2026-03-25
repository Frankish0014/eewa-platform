/**
 * In-app notification list service — create notifications for events, list for user.
 */
import type { NotificationRepository } from './notification.repository';
import type { PrismaClient } from '@prisma/client';

export interface NotificationItemDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export function createNotificationListService(
  repo: NotificationRepository,
  prisma: PrismaClient
) {
  return {
    async listForUser(userId: string, unreadOnly?: boolean): Promise<NotificationItemDto[]> {
      // Backfill mentorship-related notifications from MentorAssignment status.
      // This handles cases where requests/responses existed before Notification table was available.
      try {
        const assignments = await prisma.mentorAssignment.findMany({
          where: { menteeId: userId },
          orderBy: { assignedAt: 'desc' },
          include: {
            project: { select: { title: true } },
            mentor: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          take: 50,
        });

        for (const a of assignments) {
          const mentorName =
            `${a.mentor.user.firstName} ${a.mentor.user.lastName}`.trim() || 'A mentor';
          const projectTitle = a.project.title;

          // Use assignment-specific link to avoid duplicates.
          const baseLink = `/projects?mentorAssignmentId=${encodeURIComponent(a.id)}`;

          if (a.status === 'REQUESTED') {
            const link = baseLink;
            const exists = await prisma.notification.findFirst({ where: { userId, link, type: 'MENTOR_REQUESTED' } });
            if (!exists) {
              await repo.create({
                userId,
                type: 'MENTOR_REQUESTED',
                title: 'Mentorship request sent',
                message: `Your mentorship request for "${projectTitle}" is pending. You will be notified when ${mentorName} responds.`,
                link,
              });
            }
          } else if (a.status === 'ACTIVE') {
            const link = baseLink;
            const exists = await prisma.notification.findFirst({ where: { userId, link, type: 'MENTOR_ACCEPTED' } });
            if (!exists) {
              await repo.create({
                userId,
                type: 'MENTOR_ACCEPTED',
                title: 'Mentorship request accepted',
                message: `${mentorName} accepted your request to mentor "${projectTitle}".`,
                link,
              });
            }
          } else if (a.status === 'REJECTED') {
            const link = `/mentors?mentorAssignmentId=${encodeURIComponent(a.id)}`;
            const exists = await prisma.notification.findFirst({ where: { userId, link, type: 'MENTOR_DECLINED' } });
            if (!exists) {
              await repo.create({
                userId,
                type: 'MENTOR_DECLINED',
                title: 'Mentorship request declined',
                message: `${mentorName} declined your request for "${projectTitle}". You can request another mentor from Find a mentor.`,
                link,
              });
            }
          }
        }
      } catch {
        // Do not block notification listing if backfill fails.
      }

      return repo.listByUserId(userId, unreadOnly);
    },

    async markRead(id: string, userId: string): Promise<void> {
      await repo.markRead(id, userId);
    },

    async markAllRead(userId: string): Promise<void> {
      await repo.markAllRead(userId);
    },

    /** When a student requests a mentor, notify mentor + mentee. */
    async createForMentorRequest(
      projectId: string,
      menteeId: string,
      mentorProfileId: string,
      assignmentId: string
    ): Promise<void> {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { title: true },
      });
      const mentor = await prisma.mentorProfile.findUnique({
        where: { id: mentorProfileId },
        select: {
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      const mentee = await prisma.user.findUnique({
        where: { id: menteeId },
        select: { firstName: true, lastName: true },
      });
      if (!project || !mentor || !mentee) return;
      const menteeName = `${mentee.firstName} ${mentee.lastName}`.trim() || 'An entrepreneur';
      const mentorName =
        `${mentor.user?.firstName ?? ''} ${mentor.user?.lastName ?? ''}`.trim() || 'a mentor';

      // Notify mentor about the new request
      await repo.create({
        userId: mentor.userId,
        type: 'MENTOR_REQUEST',
        title: 'New mentorship request',
        message: `${menteeName} requested you as mentor for "${project.title}".`,
        link: `/mentor/requests?assignmentId=${encodeURIComponent(assignmentId)}`,
      });

      // Notify mentee that their request was sent
      await repo.create({
        userId: menteeId,
        type: 'MENTOR_REQUESTED',
        title: 'Mentorship request sent',
        message: `You requested ${mentorName} as mentor for "${project.title}". You will be notified when they respond.`,
        link: `/projects?mentorAssignmentId=${encodeURIComponent(assignmentId)}`,
      });
    },

    /** When someone sends a mentorship message, notify the recipient (bell + notifications page). */
    async createForNewMessage(
      receiverId: string,
      senderName: string,
      plainBody: string,
      conversationId: string
    ): Promise<void> {
      const preview =
        plainBody.length > 140 ? `${plainBody.slice(0, 137)}…` : plainBody;
      await repo.create({
        userId: receiverId,
        type: 'MESSAGE_RECEIVED',
        title: 'New message',
        message: `${senderName} sent you a message: ${preview}`,
        link: `/messages?conversationId=${encodeURIComponent(conversationId)}`,
      });
    },

    /** When a mentor accepts or declines, notify the student (mentee). */
    async createForMentorResponse(assignmentId: string, accept: boolean): Promise<void> {
      const a = await prisma.mentorAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          project: { select: { title: true } },
          mentor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
      if (!a) return;
      const mentorName =
        `${a.mentor.user.firstName} ${a.mentor.user.lastName}`.trim() || 'A mentor';
      const projectTitle = a.project.title;
      if (accept) {
        await repo.create({
          userId: a.menteeId,
          type: 'MENTOR_ACCEPTED',
          title: 'Mentorship request accepted',
          message: `${mentorName} accepted your request to mentor "${projectTitle}".`,
          link: `/projects?mentorAssignmentId=${encodeURIComponent(assignmentId)}`,
        });
      } else {
        await repo.create({
          userId: a.menteeId,
          type: 'MENTOR_DECLINED',
          title: 'Mentorship request declined',
          message: `${mentorName} declined your request for "${projectTitle}". You can request another mentor from Find a mentor.`,
          link: `/mentors?mentorAssignmentId=${encodeURIComponent(assignmentId)}`,
        });
      }
    },
  };
}

export type NotificationListService = ReturnType<typeof createNotificationListService>;
