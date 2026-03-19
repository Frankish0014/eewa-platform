import { z } from 'zod';

export const opportunityCreateSchema = z.object({
  body: z.object({
    sectorId: z.string().min(1, 'Sector required'),
    title: z.string().min(1, 'Title required').max(300),
    description: z.string().max(5000).optional(),
    link: z.string().url().optional().or(z.literal('')),
  }),
});

export const opportunityUpdateSchema = z.object({
  body: z.object({
    sectorId: z.string().min(1).optional(),
    title: z.string().min(1, 'Title required').max(300).optional(),
    description: z.string().max(5000).optional(),
    link: z.string().url().optional().or(z.literal('')),
  }),
});

export const opportunityVerifySchema = z.object({
  body: z.object({
    approve: z.boolean(),
  }),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>['body'];
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>['body'];
