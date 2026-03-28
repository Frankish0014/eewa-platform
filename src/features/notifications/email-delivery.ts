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

export function createEmailDelivery(env: Env): EmailDelivery {
  const host = env.SMTP_HOST?.trim();
  const from = formatSmtpFrom(env);
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
  if (!env.SMTP_FROM?.trim() && !smtpDefaultFromNoted) {
    smtpDefaultFromNoted = true;
    logger.info('SMTP_FROM not set; using default From address', {
      defaultFrom: EEWA_DEFAULT_TRANSACTIONAL_EMAIL,
      hint: 'Set SMTP_FROM to override; verify this domain (SPF/DKIM) with your email provider or mail will bounce or land in spam.',
    });
  }
  const transporter = nodemailer.createTransport({
    host,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE === 'true' || env.SMTP_SECURE === '1',
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
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
        logger.error('SMTP sendMail failed', {
          to,
          subject,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
  };
}
