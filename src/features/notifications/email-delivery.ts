/**
 * Transactional email — Resend API (recommended on PaaS) or SMTP (incl. Gmail).
 */
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type { Env } from '../../config';
import { EEWA_DEFAULT_TRANSACTIONAL_EMAIL, resolveSmtpMailbox } from '../../config';
import { logger } from '../../common/logger';

export interface EmailDelivery {
  /** True when mail is sent over the network (SMTP or Resend). False when sendMail only logs (no SMTP_HOST). */
  isConfigured(): boolean;
  sendMail(to: string, subject: string, text: string, html?: string): Promise<void>;
}

const RETRYABLE_MAIL_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ESOCKETTIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

function isRetryableMailError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; responseCode?: number };
  if (e.code && RETRYABLE_MAIL_CODES.has(e.code)) return true;
  const msg = String((e as Error).message || '').toLowerCase();
  if (
    msg.includes('timeout') ||
    msg.includes('temporar') ||
    msg.includes('try again') ||
    msg.includes('connection closed') ||
    msg.includes('socket')
  ) {
    return true;
  }
  const rc = e.responseCode;
  if (typeof rc === 'number' && rc >= 421 && rc < 500) return true;
  return false;
}

/**
 * Retries transient SMTP/network failures (common right after deploy or with Gmail from cloud hosts).
 * Do not use for flows where duplicate sends are unsafe without idempotency.
 */
export async function sendMailWithRetry(
  delivery: EmailDelivery,
  to: string,
  subject: string,
  text: string,
  html?: string,
  opts?: { attempts?: number; label?: string },
): Promise<void> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  const label = opts?.label ?? 'sendMail';
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await delivery.sendMail(to, subject, text, html);
      return;
    } catch (e) {
      lastErr = e;
      const willRetry = i < attempts - 1 && isRetryableMailError(e);
      logger.warn(`${label}: attempt ${i + 1}/${attempts} failed`, {
        willRetry,
        message: e instanceof Error ? e.message : String(e),
      });
      if (!willRetry) throw e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

let smtpMissingProductionWarned = false;
let smtpDefaultFromNoted = false;

function normalizeRecipientEmail(to: string): string {
  return to.replace(/\uFEFF/g, '').trim().toLowerCase();
}

function resendResponseMessageId(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const o = parsed as Record<string, unknown>;
  if (typeof o.id === 'string') return o.id;
  const d = o.data;
  if (d && typeof d === 'object' && typeof (d as { id?: unknown }).id === 'string') {
    return (d as { id: string }).id;
  }
  return undefined;
}

function resendFromHeader(env: Env): string {
  const addr = env.SMTP_FROM!.trim();
  if (addr.includes('<') && addr.includes('>')) return addr;
  const name = (env.SMTP_FROM_NAME ?? 'EEWA').trim().replace(/[\r\n"]/g, ' ') || 'EEWA';
  return `${name} <${addr}>`;
}

/** Resend is HTTPS from the host — avoids Gmail SMTP blocks from datacenter IPs (e.g. Render). */
function createResendDelivery(env: Env): EmailDelivery {
  const key = env.RESEND_API_KEY!.trim();
  return {
    isConfigured: () => true,
    async sendMail(to, subject, text, html) {
      const recipient = normalizeRecipientEmail(to);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromHeader(env),
          to: [recipient],
          subject,
          text,
          ...(html ? { html } : {}),
        }),
      });
      const raw = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        parsed = raw;
      }
      if (!res.ok) {
        logger.error('Resend API failed', { status: res.status, body: parsed });
        throw new Error(
          `Resend API ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`,
        );
      }
      const id = resendResponseMessageId(parsed);
      logger.info('Resend email sent', {
        toMasked: recipient.replace(/^(.{2})[^@]*(@.+)$/, '$1***$2'),
        id,
      });
    },
  };
}

/** RFC5322 From — use "Name" <addr@domain> when only a bare address is configured. */
function formatSmtpFrom(env: Env): string {
  const addr = resolveSmtpMailbox(env);
  if (!addr) return '';
  if (addr.includes('<') && addr.includes('>')) return addr;
  const name = (env.SMTP_FROM_NAME ?? 'EEWA').trim().replace(/[\r\n"]/g, ' ').trim();
  return `"${name}" <${addr}>`;
}

function isGmailSmtpHost(host: string): boolean {
  return /^smtp\.gmail\.com$/i.test(host.trim());
}

/**
 * Gmail only sends as the authenticated account or a configured "Send mail as" alias.
 * Our default `no-reply@eewa-platform.com` will make Gmail reject the message.
 */
function resolveEnvelopeFrom(env: Env, host: string): string {
  let from = formatSmtpFrom(env);
  if (!isGmailSmtpHost(host) || !env.SMTP_USER?.trim()) {
    return from;
  }
  const mailbox = resolveSmtpMailbox(env);
  const user = env.SMTP_USER.trim();
  if (!env.SMTP_FROM?.trim() || mailbox === EEWA_DEFAULT_TRANSACTIONAL_EMAIL) {
    const name = (env.SMTP_FROM_NAME ?? 'EEWA').trim().replace(/[\r\n"]/g, ' ') || 'EEWA';
    from = `"${name}" <${user}>`;
    if (!smtpDefaultFromNoted) {
      smtpDefaultFromNoted = true;
      logger.info('Gmail: using SMTP_USER as From address (set SMTP_FROM only if it is a verified alias in Google).');
    }
  }
  return from;
}

export function createEmailDelivery(env: Env): EmailDelivery {
  // Optional: only used when both are set; Gmail + normal SMTP work without this or a custom domain.
  if (env.RESEND_API_KEY?.trim() && env.SMTP_FROM?.trim()) {
    return createResendDelivery(env);
  }
  if (env.RESEND_API_KEY?.trim() && !env.SMTP_FROM?.trim()) {
    logger.warn('RESEND_API_KEY is set but SMTP_FROM is missing — falling back to SMTP.');
  }

  const host = env.SMTP_HOST?.trim() ?? '';
  if (!host) {
    return {
      isConfigured: () => false,
      async sendMail(to, subject, text, _html) {
        if (env.NODE_ENV === 'production' && !smtpMissingProductionWarned) {
          smtpMissingProductionWarned = true;
          logger.warn(
            'SMTP_HOST is unset — transactional email (welcome, sign-in codes, opportunities) is not sent. Configure SMTP in production.',
          );
        }
        logger.info('Email (SMTP not configured)', { to, subject, preview: text.slice(0, 160) });
      },
    };
  }

  const from = resolveEnvelopeFrom(env, host);

  if (!env.SMTP_FROM?.trim() && !smtpDefaultFromNoted) {
    smtpDefaultFromNoted = true;
    logger.info('SMTP_FROM not set; using default From address', {
      defaultFrom: EEWA_DEFAULT_TRANSACTIONAL_EMAIL,
      hint: 'Set SMTP_FROM to override; verify this domain (SPF/DKIM) with your email provider or mail will bounce or land in spam.',
    });
  }

  /** Avoid multi-minute hangs when the host is wrong, blocked, or TLS mismatches (common in production misconfig). */
  const connectionTimeout = 15_000;
  const greetingTimeout = 15_000;
  const socketTimeout = 25_000;
  const timeoutOpts = {
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    dnsTimeout: 10_000 as const,
  };

  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();
  const auth = user && pass ? { auth: { user, pass } } : {};

  /**
   * Gmail: use Nodemailer’s built-in `service: 'gmail'` (same as earlier EEWA deploys that worked well).
   * We only add `family: 4` so some cloud hosts prefer IPv4 to Google; avoid strict requireTLS/custom TLS
   * that broke working setups on a few platforms.
   */
  const useGmailAppPassword = isGmailSmtpHost(host) && !!user && !!pass;
  const port = env.SMTP_PORT ?? 587;
  const secure = env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1';

  /** `family` is a Node net.connect option (IPv4); omitted from @types/nodemailer but honored at runtime. */
  type SmtpOpts = SMTPTransport.Options & { family?: number };

  const transporter = useGmailAppPassword
    ? nodemailer.createTransport({
        service: 'gmail',
        ...auth,
        ...timeoutOpts,
        family: 4,
      } as SmtpOpts)
    : nodemailer.createTransport({
        host,
        port,
        secure,
        ...timeoutOpts,
        ...auth,
      } as SmtpOpts);

  const smtpConfigured = Boolean(user && pass);

  return {
    isConfigured: () => smtpConfigured,
    async sendMail(to, subject, text, html) {
      const recipient = normalizeRecipientEmail(to);
      try {
        const info = await transporter.sendMail({
          from,
          to: recipient,
          subject,
          text,
          ...(html ? { html } : {}),
          ...(env.SUPPORT_EMAIL?.trim() ? { replyTo: env.SUPPORT_EMAIL.trim() } : {}),
        });
        logger.info('SMTP email sent', {
          toMasked: recipient.replace(/^(.{2})[^@]*(@.+)$/, '$1***$2'),
          messageId: info.messageId,
        });
      } catch (err) {
        const nodemailerErr = err as { code?: string; responseCode?: number; command?: string };
        logger.error('SMTP sendMail failed', {
          to: recipient,
          subject,
          message: err instanceof Error ? err.message : String(err),
          smtpCode: nodemailerErr.code,
          responseCode: nodemailerErr.responseCode,
          command: nodemailerErr.command,
        });
        throw err;
      }
    },
  };
}
