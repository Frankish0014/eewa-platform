/**
 * Mentor matching by project sector — to be implemented with repository.
 */
export interface MentorMatchingService {
  matchBySector(projectId: string, sectorId: string): Promise<unknown[]>;
}

export function createMentorMatchingService(): MentorMatchingService {
  return {
    async matchBySector() {
      return [];
    },
  };
}
