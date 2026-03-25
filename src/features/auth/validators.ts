/**
 * Auth request validation (Zod).
 */
import { z } from 'zod';

const sixDigitCodeSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, ''))
  .pipe(z.string().min(6, 'Enter the 6-digit code').max(12));

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password required'),
    deviceToken: z.string().min(32).max(128).optional(),
  }),
});

export const emailOtpVerifySchema = z.object({
  body: z.object({
    emailOtpToken: z.string().min(1, 'Verification token required'),
    code: sixDigitCodeSchema,
  }),
});

export const registerSchema = z
  .object({
    body: z.object({
      email: z.string().email('Valid email required'),
      password: passwordSchema,
      firstName: z.string().min(1, 'First name required').max(100),
      lastName: z.string().min(1, 'Last name required').max(100),
      role: z.enum(['Student', 'Mentor', 'OpportunityProvider', 'InstitutionStaff'], { required_error: 'Please select your role' }),
      institutionName: z.string().max(200).optional(),
      institutionCountry: z.string().max(100).optional(),
    }),
  })
  .refine(
    (data) => {
      if (data.body.role !== 'InstitutionStaff') return true;
      const name = data.body.institutionName?.trim();
      const country = data.body.institutionCountry?.trim();
      return !!name && !!country;
    },
    { message: 'Institution name and country are required for institution staff', path: ['body', 'institutionName'] }
  );

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token required'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshInput = z.infer<typeof refreshSchema>['body'];
