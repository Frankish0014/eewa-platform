/**
 * Notification abstraction — email (and future channels).
 */
export interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export function createNotificationService(): NotificationService {
  return {
    async sendEmail(_to, _subject, _body) {
      // TODO: wire to nodemailer or SendGrid
    },
  };
}
