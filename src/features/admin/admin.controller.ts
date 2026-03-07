/**
 * Admin-only endpoints: list users, list audit log.
 */
import type { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export interface AdminUserDto {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface VentureOverviewItem {
  id: string;
  title: string;
  sectorName: string;
  status: string;
  stage: string | null;
  country: string | null;
  createdAt: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  ownerRole: string;
}

export interface VenturesOverviewDto {
  total: number;
  ventures: VentureOverviewItem[];
  byUser: { userId: string; email: string; name: string; role: string; count: number }[];
}

export function createAdminController(prisma: PrismaClient) {
  return {
    async listUsers(_req: Request, res: Response): Promise<void> {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });
      const list: AdminUserDto[] = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt.toISOString(),
      }));
      res.json({ users: list });
    },

    async listAuditLog(req: Request, res: Response): Promise<void> {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { email: true } } },
      });
      const list: AuditLogDto[] = logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userEmail: l.user.email,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        metadata: (l.metadata as Record<string, unknown>) ?? {},
        createdAt: l.createdAt.toISOString(),
      }));
      res.json({ auditLog: list });
    },

    async listVenturesOverview(_req: Request, res: Response): Promise<void> {
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          sector: { select: { name: true } },
          owner: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        },
      });
      const ventures: VentureOverviewItem[] = projects.map((p) => ({
        id: p.id,
        title: p.title,
        sectorName: p.sector.name,
        status: p.status,
        stage: p.stage ?? null,
        country: p.country ?? null,
        createdAt: p.createdAt.toISOString(),
        ownerId: p.owner.id,
        ownerEmail: p.owner.email,
        ownerName: `${p.owner.firstName} ${p.owner.lastName}`,
        ownerRole: p.owner.role,
      }));
      const byUserMap = new Map<string, { userId: string; email: string; name: string; role: string; count: number }>();
      for (const p of projects) {
        const key = p.ownerId;
        if (!byUserMap.has(key)) {
          byUserMap.set(key, {
            userId: p.owner.id,
            email: p.owner.email,
            name: `${p.owner.firstName} ${p.owner.lastName}`,
            role: p.owner.role,
            count: 0,
          });
        }
        byUserMap.get(key)!.count += 1;
      }
      const byUser = Array.from(byUserMap.values()).sort((a, b) => b.count - a.count);
      res.json({
        overview: {
          total: ventures.length,
          ventures,
          byUser,
        },
      });
    },
  };
}
