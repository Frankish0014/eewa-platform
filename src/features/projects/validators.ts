/**
 * Project request validation — fundability fields for Africa.
 */
import { z } from 'zod';

const stageEnum = z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'REVENUE', 'SCALING']);
const legalStatusEnum = z.enum(['UNREGISTERED', 'IN_PROGRESS', 'REGISTERED']);

export const projectCreateSchema = z.object({
  body: z.object({
    sectorId: z.string().min(1, 'Sector is required'),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional(),
    problemStatement: z.string().max(2000).optional(),
    targetMarket: z.string().max(2000).optional(),
    businessModel: z.string().max(2000).optional(),
    fundingAmountSought: z.coerce.number().min(0).optional(),
    fundingUse: z.string().max(2000).optional(),
    stage: stageEnum.optional(),
    legalStatus: legalStatusEnum.optional(),
    country: z.string().max(100).optional(),
    teamSize: z.coerce.number().int().min(0).max(500).optional(),
    website: z.union([z.string().url(), z.literal('')]).optional(),
    impactDescription: z.string().max(2000).optional(),
    traction: z.string().max(2000).optional(),
    registrationNumber: z.string().max(100).optional(),
  }),
});

export const projectUpdateSchema = z.object({
  body: z.object({
    sectorId: z.string().min(1).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    problemStatement: z.string().max(2000).optional(),
    targetMarket: z.string().max(2000).optional(),
    businessModel: z.string().max(2000).optional(),
    fundingAmountSought: z.coerce.number().min(0).optional(),
    fundingUse: z.string().max(2000).optional(),
    stage: stageEnum.optional(),
    legalStatus: legalStatusEnum.optional(),
    country: z.string().max(100).optional(),
    teamSize: z.coerce.number().int().min(0).max(500).optional(),
    website: z.union([z.string().url(), z.literal('')]).optional(),
    impactDescription: z.string().max(2000).optional(),
    traction: z.string().max(2000).optional(),
    registrationNumber: z.string().max(100).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  }),
});
