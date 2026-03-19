/**
 * Reporting — aggregates for Admin and Institution Staff.
 */
import type { PrismaClient } from '@prisma/client';

export interface ProjectsBySectorRow {
  sectorId: string;
  sectorName: string;
  count: number;
}

export interface ProjectsByStatusRow {
  status: string;
  count: number;
}

export interface ReportSummary {
  totalUsers: number;
  totalProjects: number;
  totalMentors: number;
  totalMentorAssignments: number;
  totalOpportunities: number;
  verifiedOpportunities: number;
  projectsByStatus: ProjectsByStatusRow[];
  projectsBySector: ProjectsBySectorRow[];
}

export type ReportingService = ReturnType<typeof createReportingService>;

export function createReportingService(prisma: PrismaClient) {
  return {
    async getSummary(): Promise<ReportSummary> {
      const [
        totalUsers,
        totalMentors,
        totalProjects,
        totalMentorAssignments,
        totalOpportunities,
        verifiedOpportunities,
        sectorCounts,
        statusCounts,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'Mentor' } }),
        prisma.project.count(),
        prisma.mentorAssignment.count(),
        prisma.opportunity.count(),
        prisma.opportunity.count({ where: { status: 'VERIFIED' } }),
        prisma.project.groupBy({
          by: ['sectorId'],
          _count: { id: true },
        }),
        prisma.project.groupBy({
          by: ['status'],
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

      const projectsByStatus: ProjectsByStatusRow[] = statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      }));

      return {
        totalUsers,
        totalMentors,
        totalProjects,
        totalMentorAssignments,
        totalOpportunities,
        verifiedOpportunities,
        projectsByStatus,
        projectsBySector,
      };
    },
  };
}
