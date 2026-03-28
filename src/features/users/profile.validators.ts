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

const optionalSkills = z
  .string()
  .max(4000)
  .optional()
  .transform((s) => {
    if (s === undefined) return undefined;
    const t = s.trim();
    return t.length === 0 ? null : t;
  });

export const updateProfileSchema = z.object({
  body: z
    .object({
      firstName: optionalTrimmedString,
      lastName: optionalTrimmedString,
      skills: optionalSkills,
      emailSignInOtpEnabled: z.boolean().optional(),
      currentPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.emailSignInOtpEnabled !== undefined) {
        const pw = data.currentPassword?.trim() ?? '';
        if (pw.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Current password is required to change email sign-in verification',
            path: ['currentPassword'],
          });
        }
      }
    }),
});

