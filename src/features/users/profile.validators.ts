/**
 * Profile update validation.
 * Trims whitespace; empty string after trim is treated as "no change" (undefined).
 */
import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .max(100)
  .optional()
  .transform((s) => {
    const t = typeof s === 'string' ? s.trim() : '';
    return t.length > 0 ? t : undefined;
  });

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: optionalTrimmedString,
    lastName: optionalTrimmedString,
  }),
});
