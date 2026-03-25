/**
 * Optional SMTP delivery — when SMTP_HOST is unset, logs only (dev-safe).
 */
import nodemailer from 'nodemailer';
import type { Env } from '../../config';
import { logger } from '../../common/logger';

export interface EmailDelivery {
  sendMail(to: string, subject: string, text: string): Promise<void>;
}

export function createEmailDelivery(env: Env): EmailDelivery {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim();
  if (!host || !from) {
    return {
      async sendMail(to, subject, text) {
        logger.info('Email (SMTP not configured)', { to, subject, preview: text.slice(0, 120) });
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
    async sendMail(to, subject, text) {
      await transporter.sendMail({
        from,
        to,
        subject,
        text,
      });
    },
  };
}
