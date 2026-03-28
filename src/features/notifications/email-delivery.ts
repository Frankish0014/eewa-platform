/**
 * Optional SMTP delivery — when SMTP_HOST / SMTP_FROM unset, logs only (dev-safe).
 * In production, logs a one-time warning so operators know emails are not delivered.
 */
import nodemailer from 'nodemailer';
import type { Env } from '../../config';
import { logger } from '../../common/logger';

export interface EmailDelivery {
  sendMail(to: string, subject: string, text: string, html?: string): Promise<void>;
}

let smtpMissingProductionWarned = false;

export function createEmailDelivery(env: Env): EmailDelivery {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) {
    return {
      async sendMail(to, subject, text, _html) {
        if (env.NODE_ENV === 'production' && !smtpMissingProductionWarned) {
          smtpMissingProductionWarned = true;
          logger.warn(
            'SMTP_HOST or SMTP_FROM is unset — transactional email (welcome, sign-in codes, opportunities) is not sent. Configure SMTP in production.',
          );
        }
        logger.info('Email (SMTP not configured)', { to, subject, preview: text.slice(0, 160) });
      },
    };
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
