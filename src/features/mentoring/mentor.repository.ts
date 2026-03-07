/**
 * Mentor profile and sector data access.
 */
import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../core/errors';

export interface MentorProfileDto {
  id: string;
  userId: string;
  bio: string | null;
  maxMentees: number;
  isActive: boolean;
  sectorIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MentorListItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  maxMentees: number;
  isActive: boolean;
  sectorIds: string[];
  sectorNames: string[];
}

export interface CreateMentorProfileData {
  bio?: string;
  maxMentees?: number;
  sectorIds: string[];
}

export interface UpdateMentorProfileData {
  bio?: string;
  maxMentees?: number;
  isActive?: boolean;
  sectorIds?: string[];
}

export function createMentorRepository(prisma: PrismaClient) {
  const getByUserId = async (userId: string): Promise<MentorProfileDto | null> => {
    const profile = await prisma.mentorProfile.findUnique({
      where: { userId },
      include: { sectors: { include: { sector: true } } },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      maxMentees: profile.maxMentees,
      isActive: profile.isActive,
      sectorIds: profile.sectors.map((s) => s.sectorId),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  };

  return {
    getByUserId,

    async upsertProfile(userId: string, data: CreateMentorProfileData | UpdateMentorProfileData): Promise<MentorProfileDto> {
      const existing = await prisma.mentorProfile.findUnique({ where: { userId } });
      const sectorIds = 'sectorIds' in data ? data.sectorIds : undefined;

      if (existing) {
        const updateData: { bio?: string; maxMentees?: number; isActive?: boolean } = {};
        if ('bio' in data && data.bio !== undefined) updateData.bio = data.bio;
        if ('maxMentees' in data && data.maxMentees !== undefined) updateData.maxMentees = data.maxMentees;
        if ('isActive' in data && data.isActive !== undefined) updateData.isActive = data.isActive;

        await prisma.mentorProfile.update({
          where: { userId },
          data: updateData,
        });
        if (sectorIds !== undefined) {
          await prisma.mentorSector.deleteMany({ where: { mentorProfileId: existing.id } });
          await prisma.mentorSector.createMany({
            data: sectorIds.map((sectorId) => ({ mentorProfileId: existing.id, sectorId })),
          });
        }
        const updated = await getByUserId(userId);
        return updated!;
      }

      const profile = await prisma.mentorProfile.create({
        data: {
          userId,
          bio: 'bio' in data ? data.bio : undefined,
          maxMentees: 'maxMentees' in data ? data.maxMentees ?? 5 : 5,
          sectors: {
            create: (sectorIds ?? []).map((sectorId) => ({ sectorId })),
          },
        },
      });
      const got = await getByUserId(profile.userId);
      return got!;
    },

    async listBySector(sectorId: string): Promise<MentorListItem[]> {
      const mentors = await prisma.mentorProfile.findMany({
        where: {
          isActive: true,
          sectors: { some: { sectorId } },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          sectors: { include: { sector: { select: { id: true, name: true } } } },
        },
      });
      return mentors.map((m) => ({
        id: m.id,
        userId: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        bio: m.bio,
        maxMentees: m.maxMentees,
        isActive: m.isActive,
        sectorIds: m.sectors.map((s) => s.sectorId),
        sectorNames: m.sectors.map((s) => s.sector.name),
      }));
    },

    async getProfileById(profileId: string): Promise<MentorListItem | null> {
      const m = await prisma.mentorProfile.findUnique({
        where: { id: profileId, isActive: true },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          sectors: { include: { sector: { select: { id: true, name: true } } } },
        },
      });
      if (!m) return null;
      return {
        id: m.id,
        userId: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        bio: m.bio,
        maxMentees: m.maxMentees,
        isActive: m.isActive,
        sectorIds: m.sectors.map((s) => s.sectorId),
        sectorNames: m.sectors.map((s) => s.sector.name),
      };
    },

    async createRequest(projectId: string, menteeId: string, mentorProfileId: string): Promise<{ id: string }> {
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true, sectorId: true } });
      if (!project) throw new NotFoundError('Project');
      if (project.ownerId !== menteeId) throw new ForbiddenError('Only the project owner can request a mentor');

      const mentor = await prisma.mentorProfile.findUnique({
        where: { id: mentorProfileId },
        include: { sectors: { where: { sectorId: project.sectorId } } },
      });
      if (!mentor || !mentor.isActive) throw new NotFoundError('Mentor');
      if (mentor.sectors.length === 0) throw new ForbiddenError('Mentor does not support this project sector');

      const existing = await prisma.mentorAssignment.findUnique({
        where: { projectId_mentorId: { projectId, mentorId: mentorProfileId } },
      });
      if (existing) throw new ForbiddenError('Request already exists for this mentor');

      const assignment = await prisma.mentorAssignment.create({
        data: {
          projectId,
          mentorId: mentorProfileId,
          menteeId,
          status: 'REQUESTED',
        },
      });
      return { id: assignment.id };
    },

    async listRequestsForMentor(mentorProfileId: string): Promise<Array<{
      id: string;
      projectId: string;
      projectTitle: string;
      menteeId: string;
      menteeName: string;
      status: string;
      assignedAt: string;
    }>> {
      const list = await prisma.mentorAssignment.findMany({
        where: { mentorId: mentorProfileId },
        orderBy: { assignedAt: 'desc' },
        include: {
          project: { select: { id: true, title: true } },
          mentee: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return list.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        projectTitle: a.project.title,
        menteeId: a.mentee.id,
        menteeName: `${a.mentee.firstName} ${a.mentee.lastName}`,
        status: a.status,
        assignedAt: a.assignedAt.toISOString(),
      }));
    },

    async respondToRequest(
      assignmentId: string,
      mentorProfileId: string,
      accept: boolean
    ): Promise<void> {
      const a = await prisma.mentorAssignment.findFirst({
        where: { id: assignmentId, mentorId: mentorProfileId },
      });
      if (!a) throw new NotFoundError('Request');
      if (a.status !== 'REQUESTED') throw new ForbiddenError('Request was already responded to');

      await prisma.mentorAssignment.update({
        where: { id: assignmentId },
        data: { status: accept ? 'ACTIVE' : 'REJECTED' },
      });
    },
  };
}

export type MentorRepository = ReturnType<typeof createMentorRepository>;
