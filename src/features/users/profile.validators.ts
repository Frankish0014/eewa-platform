/**
 * Profile update validation.
 */
import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name required').max(100).optional(),
    lastName: z.string().min(1, 'Last name required').max(100).optional(),
  }),
});
