/**
 * Optional SMTP delivery — when SMTP_HOST / SMTP_FROM unset, logs only (dev-safe).
 * In production, logs a one-time warning so operators know emails are not delivered.
 */
import nodemailer from 'nodemailer';
import type { Env } from '../../config';
import { EEWA_DEFAULT_TRANSACTIONAL_EMAIL, resolveSmtpMailbox } from '../../config';
import { logger } from '../../common/logger';

export interface EmailDelivery {
  sendMail(to: string, subject: string, text: string, html?: string): Promise<void>;
}

let smtpMissingProductionWarned = false;
let smtpDefaultFromNoted = false;

/** RFC5322 From — use "Name" <addr@domain> when only a bare address is configured. */
function formatSmtpFrom(env: Env): string {
  const addr = resolveSmtpMailbox(env);
  if (!addr) return '';
  if (addr.includes('<') && addr.includes('>')) return addr;
  const name = (env.SMTP_FROM_NAME ?? 'EEWA').trim() || 'EEWA';
  const safeName = name.replace(/[\r\n"]/g, ' ').trim();
  return `"${safeName}" <${addr}>`;
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
  const host = env.SMTP_HOST?.trim() ?? '';
  if (!host) {
    return {
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

  /** Preset fixes common 587/STARTTLS vs 465/SSL mistakes for Gmail. */
  const useGmailService = isGmailSmtpHost(host) && !!user && !!pass;

  const transporter = useGmailService
    ? nodemailer.createTransport({
        service: 'gmail',
        ...auth,
        ...timeoutOpts,
      })
    : nodemailer.createTransport({
        host,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
        ...timeoutOpts,
        ...auth,
      });

  return {
    async sendMail(to, subject, text, html) {
      try {
        await transporter.sendMail({
          from,
          to,
          subject,
          text,
          ...(html ? { html } : {}),
          ...(env.SUPPORT_EMAIL?.trim() ? { replyTo: env.SUPPORT_EMAIL.trim() } : {}),
        });
      } catch (err) {
        const nodemailerErr = err as { code?: string; responseCode?: number; command?: string };
        logger.error('SMTP sendMail failed', {
          to,
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
