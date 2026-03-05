/**
 * Simple dependency injection container for production wiring.
 * Register implementations here; controllers receive services via constructor.
 */
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';

export interface Container {
  prisma: PrismaClient;
  logger: Logger;
  // Services registered per feature — see app bootstrap
}

export function createContainer(deps: {
  prisma: PrismaClient;
  logger: Logger;
}): Container {
  return {
    prisma: deps.prisma,
    logger: deps.logger,
  };
}
