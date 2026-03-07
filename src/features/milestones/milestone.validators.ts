import { z } from 'zod';

export const milestoneCreateSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title required').max(200),
    description: z.string().max(5000).optional(),
    dueDate: z.string().optional(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export const milestoneUpdateSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional().nullable(),
    dueDate: z.string().optional().nullable(),
    completedAt: z.string().optional().nullable(),
    orderIndex: z.number().int().min(0).optional(),
  }),
});

export type MilestoneCreateInput = z.infer<typeof milestoneCreateSchema>['body'];
export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>['body'];
