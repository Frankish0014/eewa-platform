import { z } from 'zod';

export const mentorProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(2000).optional(),
    maxMentees: z.number().int().min(1).max(20).optional(),
    isActive: z.boolean().optional(),
    sectorIds: z.array(z.string().min(1)).optional(),
  }),
});

export const mentorRequestSchema = z.object({
  body: z.object({
    mentorId: z.string().min(1, 'Mentor ID required'),
  }),
});

export const mentorRespondSchema = z.object({
  body: z.object({
    accept: z.boolean(),
  }),
});

export type MentorProfileInput = z.infer<typeof mentorProfileSchema>['body'];
export type MentorRespondInput = z.infer<typeof mentorRespondSchema>['body'];
