/**
 * Audit logging — login, project edits, mentor assignments, opportunity approvals.
 */
import type { PrismaClient } from '@prisma/client';

export type AuditAction =
  | 'LOGIN'
  | 'PROJECT_CREATE'
  | 'PROJECT_EDIT'
  | 'PROJECT_DELETE'
  | 'MENTOR_ASSIGN'
  | 'MENTOR_UNASSIGN'
  | 'OPPORTUNITY_APPROVE'
  | 'OPPORTUNITY_REJECT';

export interface AuditEntry {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditService {
  log(entry: AuditEntry): Promise<void>;
}

export function createAuditService(prisma: PrismaClient): AuditService {
  return {
    async log(entry) {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          metadata: (entry.metadata ?? {}) as object,
        },
      });
    },
  };
}
