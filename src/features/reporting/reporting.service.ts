/**
 * Reporting — aggregates for Admin and Institution Staff.
 */
import type { PrismaClient } from '@prisma/client';

export interface ProjectsBySectorRow {
  sectorId: string;
  sectorName: string;
  count: number;
}

export interface ReportSummary {
  totalProjects: number;
  totalMentorAssignments: number;
  totalOpportunities: number;
  verifiedOpportunities: number;
  projectsBySector: ProjectsBySectorRow[];
}

export type ReportingService = ReturnType<typeof createReportingService>;

export function createReportingService(prisma: PrismaClient) {
  return {
    async getSummary(): Promise<ReportSummary> {
      const [
        totalProjects,
        totalMentorAssignments,
        totalOpportunities,
        verifiedOpportunities,
        sectorCounts,
      ] = await Promise.all([
        prisma.project.count(),
        prisma.mentorAssignment.count(),
        prisma.opportunity.count(),
        prisma.opportunity.count({ where: { status: 'VERIFIED' } }),
        prisma.project.groupBy({
          by: ['sectorId'],
          _count: { id: true },
        }),
      ]);

      const sectorIds = sectorCounts.map((s) => s.sectorId);
      const sectors = sectorIds.length
        ? await prisma.sector.findMany({
            where: { id: { in: sectorIds } },
            select: { id: true, name: true },
          })
        : [];
      const sectorMap = new Map(sectors.map((s) => [s.id, s.name]));

      const projectsBySector: ProjectsBySectorRow[] = sectorCounts.map((s) => ({
        sectorId: s.sectorId,
        sectorName: sectorMap.get(s.sectorId) ?? 'Unknown',
        count: s._count.id,
      }));

      return {
        totalProjects,
        totalMentorAssignments,
        totalOpportunities,
        verifiedOpportunities,
        projectsBySector,
      };
    },
  };
}
