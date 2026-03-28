/**
 * Application configuration — env validation and typed config.
 * All env access goes through this module.
 */
import { z } from 'zod';

/** Trim and strip wrapping quotes from DATABASE_URL (host UIs / .env paste issues). */
function normalizeDatabaseUrlInEnv(): void {
  const raw = process.env.DATABASE_URL;
  if (raw === undefined) return;
  let u = raw.replace(/^\uFEFF/u, '').trim();
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  process.env.DATABASE_URL = u;
}

normalizeDatabaseUrlInEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_EMAIL_OTP_PENDING_EXPIRES_IN: z.string().default('15m'),
  EMAIL_OTP_CODE_TTL_MINUTES: z.coerce.number().default(15),
  EMAIL_OTP_RESEND_SECONDS: z.coerce.number().default(60),
  PASSWORD_RESET_TOKEN_TTL_HOURS: z.coerce.number().default(1),
  PASSWORD_RESET_RESEND_SECONDS: z.coerce.number().default(60),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex for AES-256
  SESSION_INACTIVITY_MINUTES: z.coerce.number().default(15),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'), // Vite default dev port; in prod use your public site URL
  /** Absolute or relative path to Vite `dist` (e.g. ./public in Docker). Empty = API-only. */
  STATIC_FILES_DIR: z.string().optional(),
  // Optional transactional email (opportunity verified, etc.)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Mailbox address (e.g. no-reply@yourdomain.com). Must be allowed by your SMTP provider / domain DNS (SPF, DKIM). */
  SMTP_FROM: z.string().optional(),
  /** Display name in the From header (default EEWA). */
  SMTP_FROM_NAME: z.string().optional(),
  /** Shown in transactional emails for user support (optional). */
  SUPPORT_EMAIL: z.string().optional(),
  /** Public site URL (https://…) for email footers — same as users’ browser origin when possible */
  PUBLIC_APP_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Default From address when `SMTP_HOST` is set but `SMTP_FROM` is omitted.
 * Deliverability requires this domain to be verified (SPF/DKIM) with your email provider.
 */
export const EEWA_DEFAULT_TRANSACTIONAL_EMAIL = 'no-reply@eewa-platform.com';

/** Resolves the mailbox for transactional email. Explicit `SMTP_FROM` always wins. */
export function resolveSmtpMailbox(env: Env): string {
  const explicit = env.SMTP_FROM?.trim();
  if (explicit) return explicit;
  if (env.SMTP_HOST?.trim()) return EEWA_DEFAULT_TRANSACTIONAL_EMAIL;
  return '';
}

function loadConfig(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const config = loadConfig();
