/**
 * Opaque device token stored client-side; only SHA-256 hash is stored server-side.
 */
import crypto from 'crypto';

export function hashDeviceToken(plain: string): string {
  return crypto.createHash('sha256').update(plain, 'utf8').digest('hex');
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
