/**
 * Project data access — CRUD for ventures (fundability fields).
 */
import type { PrismaClient } from '@prisma/client';

export interface ProjectCreateData {
  sectorId: string;
  title: string;
  description?: string;
  problemStatement?: string;
  targetMarket?: string;
  businessModel?: string;
  fundingAmountSought?: number;
  fundingUse?: string;
  stage?: string;
  legalStatus?: string;
  country?: string;
  teamSize?: number;
  website?: string;
  impactDescription?: string;
  traction?: string;
  registrationNumber?: string;
}

export interface ProjectUpdateData {
  sectorId?: string;
  title?: string;
  description?: string;
  problemStatement?: string;
  targetMarket?: string;
  businessModel?: string;
  fundingAmountSought?: number;
  fundingUse?: string;
  stage?: string;
  legalStatus?: string;
  country?: string;
  teamSize?: number;
  website?: string;
  impactDescription?: string;
  traction?: string;
  registrationNumber?: string;
  status?: string;
}

export interface ProjectWithSector {
  id: string;
  ownerId: string;
  sectorId: string;
  title: string;
  description: string | null;
  status: string;
  problemStatement: string | null;
  targetMarket: string | null;
  businessModel: string | null;
  fundingAmountSought: unknown;
  fundingUse: string | null;
  stage: string | null;
  legalStatus: string | null;
  country: string | null;
  teamSize: number | null;
  website: string | null;
  impactDescription: string | null;
  traction: string | null;
  registrationNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  sector: { id: string; name: string };
}

export interface ProjectRepository {
  create(ownerId: string, data: ProjectCreateData): Promise<ProjectWithSector>;
  findManyByOwner(ownerId: string): Promise<ProjectWithSector[]>;
  findById(id: string): Promise<ProjectWithSector | null>;
  update(id: string, ownerId: string, data: ProjectUpdateData): Promise<ProjectWithSector>;
  delete(id: string, ownerId: string): Promise<void>;
}

export function createProjectRepository(prisma: PrismaClient): ProjectRepository {
  const projectData = (data: ProjectCreateData | ProjectUpdateData) => ({
    ...(data.sectorId !== undefined && { sectorId: data.sectorId }),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description ?? null }),
    ...(data.problemStatement !== undefined && { problemStatement: data.problemStatement ?? null }),
    ...(data.targetMarket !== undefined && { targetMarket: data.targetMarket ?? null }),
    ...(data.businessModel !== undefined && { businessModel: data.businessModel ?? null }),
    ...(data.fundingAmountSought !== undefined && { fundingAmountSought: data.fundingAmountSought }),
    ...(data.fundingUse !== undefined && { fundingUse: data.fundingUse ?? null }),
    ...(data.stage !== undefined && { stage: data.stage ?? null }),
    ...(data.legalStatus !== undefined && { legalStatus: data.legalStatus ?? null }),
    ...(data.country !== undefined && { country: data.country ?? null }),
    ...(data.teamSize !== undefined && { teamSize: data.teamSize }),
    ...(data.website !== undefined && { website: data.website || null }),
    ...(data.impactDescription !== undefined && { impactDescription: data.impactDescription ?? null }),
    ...(data.traction !== undefined && { traction: data.traction ?? null }),
    ...(data.registrationNumber !== undefined && { registrationNumber: data.registrationNumber ?? null }),
    ...('status' in data && data.status !== undefined && { status: data.status }),
  });

  return {
    async create(ownerId, data) {
      const project = await prisma.project.create({
        data: {
          ownerId,
          sectorId: data.sectorId,
          title: data.title,
          description: data.description ?? null,
          status: 'DRAFT',
          problemStatement: data.problemStatement ?? null,
          targetMarket: data.targetMarket ?? null,
          businessModel: data.businessModel ?? null,
          fundingAmountSought: data.fundingAmountSought ?? null,
          fundingUse: data.fundingUse ?? null,
          stage: data.stage ?? null,
          legalStatus: data.legalStatus ?? null,
          country: data.country ?? null,
          teamSize: data.teamSize ?? null,
          website: data.website || null,
          impactDescription: data.impactDescription ?? null,
          traction: data.traction ?? null,
          registrationNumber: data.registrationNumber ?? null,
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return project as ProjectWithSector;
    },

    async findManyByOwner(ownerId) {
      const projects = await prisma.project.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return projects as ProjectWithSector[];
    },

    async findById(id) {
      const project = await prisma.project.findUnique({
        where: { id },
        include: { sector: { select: { id: true, name: true } } },
      });
      return project as ProjectWithSector | null;
    },

    async update(id, ownerId, data) {
      const updateData = projectData(data);
      if (Object.keys(updateData).length === 0) {
        const existing = await prisma.project.findUnique({ where: { id }, include: { sector: { select: { id: true, name: true } } } });
        if (!existing || existing.ownerId !== ownerId) throw new Error('Project not found');
        return existing as ProjectWithSector;
      }
      const result = await prisma.project.updateMany({
        where: { id, ownerId },
        data: updateData,
      });
      if (result.count === 0) throw new Error('Project not found');
      const updated = await prisma.project.findUnique({
        where: { id },
        include: { sector: { select: { id: true, name: true } } },
      });
      return updated as ProjectWithSector;
    },

    async delete(id, ownerId) {
      const result = await prisma.project.deleteMany({ where: { id, ownerId } });
      if (result.count === 0) throw new Error('Project not found');
    },
  };
}
