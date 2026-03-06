/**
 * Project business logic — ventures for funding (Africa-ready).
 */
import type { ProjectRepository, ProjectWithSector, ProjectCreateData, ProjectUpdateData } from './project.repository';
import { NotFoundError, ForbiddenError } from '../../core/errors';

export interface ProjectDto {
  id: string;
  ownerId: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string | null;
  status: string;
  problemStatement: string | null;
  targetMarket: string | null;
  businessModel: string | null;
  fundingAmountSought: number | null;
  fundingUse: string | null;
  stage: string | null;
  legalStatus: string | null;
  country: string | null;
  teamSize: number | null;
  website: string | null;
  impactDescription: string | null;
  traction: string | null;
  registrationNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectService = ReturnType<typeof createProjectService>;

function toDto(p: ProjectWithSector): ProjectDto {
  const funding = p.fundingAmountSought;
  const fundingNum = funding != null
    ? (typeof funding === 'object' && 'toNumber' in funding
      ? (funding as { toNumber: () => number }).toNumber()
      : Number(funding))
    : null;

  return {
    id: p.id,
    ownerId: p.ownerId,
    sectorId: p.sectorId,
    sectorName: p.sector.name,
    title: p.title,
    description: p.description,
    status: p.status,
    problemStatement: p.problemStatement ?? null,
    targetMarket: p.targetMarket ?? null,
    businessModel: p.businessModel ?? null,
    fundingAmountSought: fundingNum,
    fundingUse: p.fundingUse ?? null,
    stage: p.stage ?? null,
    legalStatus: p.legalStatus ?? null,
    country: p.country ?? null,
    teamSize: p.teamSize ?? null,
    website: p.website ?? null,
    impactDescription: p.impactDescription ?? null,
    traction: p.traction ?? null,
    registrationNumber: p.registrationNumber ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function createProjectService(repo: ProjectRepository) {
  return {
    async create(ownerId: string, data: ProjectCreateData): Promise<ProjectDto> {
      const project = await repo.create(ownerId, data);
      return toDto(project);
    },

    async listByOwner(ownerId: string): Promise<ProjectDto[]> {
      const projects = await repo.findManyByOwner(ownerId);
      return projects.map(toDto);
    },

    async getById(id: string, userId: string): Promise<ProjectDto> {
      const project = await repo.findById(id);
      if (!project) throw new NotFoundError('Project');
      if (project.ownerId !== userId) throw new ForbiddenError('You can only view your own projects');
      return toDto(project);
    },

    async update(id: string, ownerId: string, data: ProjectUpdateData): Promise<ProjectDto> {
      const project = await repo.update(id, ownerId, data);
      return toDto(project);
    },

    async delete(id: string, ownerId: string): Promise<void> {
      await repo.delete(id, ownerId);
    },
  };
}
