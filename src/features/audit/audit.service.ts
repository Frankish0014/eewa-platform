/**
 * Audit logging — login, register, project edits, profile edits, opportunity create/edit/approve.
 */
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../common/logger';

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_TRUSTED_DEVICE'
  | 'LOGIN_EMAIL_OTP_SENT'
  | 'LOGIN_EMAIL_OTP_VERIFIED'
  | 'EMAIL_SIGN_IN_OTP_SETTING'
  | 'REGISTER'
  | 'PROJECT_CREATE'
  | 'PROJECT_EDIT'
  | 'PROJECT_DELETE'
  | 'PROFILE_EDIT'
  | 'ACCOUNT_DELETE'
  | 'MENTOR_ASSIGN'
  | 'MENTOR_UNASSIGN'
  | 'OPPORTUNITY_CREATE'
  | 'OPPORTUNITY_EDIT'
  | 'OPPORTUNITY_APPROVE'
  | 'OPPORTUNITY_REJECT'
  | 'OPPORTUNITY_APPLY';

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

function safeMetadata(meta: Record<string, unknown> | undefined): object {
  if (meta == null) return {};
  try {
    return JSON.parse(JSON.stringify(meta)) as object;
  } catch {
    return {};
  }
}

export function createAuditService(prisma: PrismaClient): AuditService {
  return {
    async log(entry) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: entry.userId,
            action: entry.action,
            resourceType: entry.resourceType,
            resourceId: entry.resourceId ?? null,
            metadata: safeMetadata(entry.metadata),
          },
        });
        logger.info('Audit log written', { action: entry.action, userId: entry.userId });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Audit log write failed', {
          action: entry.action,
          userId: entry.userId,
          error: message,
        });
        console.error('[EEWA] Audit log write failed:', message, err);
      }
    },
  };
}
