/**
 * Mentor profile and matching service.
 */
import type { MentorProfileDto, MentorListItem } from './mentor.repository';
import type { MentorRepository } from './mentor.repository';

export type MentorService = ReturnType<typeof createMentorService>;

export function createMentorService(repo: MentorRepository) {
  return {
    async getMyProfile(userId: string): Promise<MentorProfileDto | null> {
      return repo.getByUserId(userId);
    },

    async upsertMyProfile(
      userId: string,
      data: { bio?: string; maxMentees?: number; isActive?: boolean; sectorIds?: string[] }
    ): Promise<MentorProfileDto> {
      return repo.upsertProfile(userId, data);
    },

    async listBySector(sectorId: string): Promise<MentorListItem[]> {
      return repo.listBySector(sectorId);
    },

    async requestMentor(projectId: string, menteeId: string, mentorProfileId: string): Promise<{ id: string }> {
      return repo.createRequest(projectId, menteeId, mentorProfileId);
    },

    async listMyRequests(mentorProfileId: string) {
      return repo.listRequestsForMentor(mentorProfileId);
    },

    async respondToRequest(assignmentId: string, mentorProfileId: string, accept: boolean): Promise<void> {
      return repo.respondToRequest(assignmentId, mentorProfileId, accept);
    },
  };
}
