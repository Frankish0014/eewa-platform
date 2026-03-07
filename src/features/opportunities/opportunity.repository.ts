/**
 * Opportunity CRUD and verification — providers create, admin verifies, students see verified.
 */
import { OpportunityStatus, type PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../core/errors';

export interface OpportunityDto {
  id: string;
  providerId: string;
  sectorId: string;
  sectorName: string;
  title: string;
  description: string | null;
  link: string | null;
  status: OpportunityStatus;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityData {
  sectorId: string;
  title: string;
  description?: string;
  link?: string;
}

export function createOpportunityRepository(prisma: PrismaClient) {
  return {
    async create(providerId: string, data: CreateOpportunityData): Promise<OpportunityDto> {
      const opp = await prisma.opportunity.create({
        data: {
          providerId,
          sectorId: data.sectorId,
          title: data.title,
          description: data.description ?? null,
          link: data.link ?? null,
          status: OpportunityStatus.PENDING,
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return toDto(opp);
    },

    async listVerified(sectorId?: string): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: {
          status: OpportunityStatus.VERIFIED,
          ...(sectorId ? { sectorId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async listPending(): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: { status: OpportunityStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async listByProvider(providerId: string): Promise<OpportunityDto[]> {
      const list = await prisma.opportunity.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        include: { sector: { select: { id: true, name: true } } },
      });
      return list.map((o) => toDto(o));
    },

    async findById(id: string): Promise<OpportunityDto | null> {
      const o = await prisma.opportunity.findUnique({
        where: { id },
        include: { sector: { select: { id: true, name: true } } },
      });
      return o ? toDto(o) : null;
    },

    async verify(id: string, adminId: string, approve: boolean): Promise<OpportunityDto> {
      const o = await prisma.opportunity.findUnique({ where: { id } });
      if (!o) throw new NotFoundError('Opportunity');
      if (o.status !== OpportunityStatus.PENDING) throw new ForbiddenError('Opportunity already reviewed');

      const updated = await prisma.opportunity.update({
        where: { id },
        data: {
          status: approve ? OpportunityStatus.VERIFIED : OpportunityStatus.REJECTED,
          verifiedById: adminId,
          verifiedAt: new Date(),
        },
        include: { sector: { select: { id: true, name: true } } },
      });
      return toDto(updated);
    },
  };
}

export type OpportunityRepository = ReturnType<typeof createOpportunityRepository>;

function toDto(o: {
  id: string;
  providerId: string;
  sectorId: string;
  title: string;
  description: string | null;
  link: string | null;
  status: OpportunityStatus;
  verifiedById: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sector: { id: string; name: string };
}): OpportunityDto {
  return {
    id: o.id,
    providerId: o.providerId,
    sectorId: o.sectorId,
    sectorName: o.sector.name,
    title: o.title,
    description: o.description,
    link: o.link,
    status: o.status,
    verifiedById: o.verifiedById,
    verifiedAt: o.verifiedAt ? o.verifiedAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
