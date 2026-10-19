import * as crypto from 'crypto';

export class PasswordUtil {
  /**
   * Hashes a plain password using PBKDF2 with a cryptographic salt (fallback safe for any environment).
   */
  static hash(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a plain password against a stored salt:hash string.
   */
  static verify(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) return false;

    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;

    const hashToVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(originalHash, 'hex'));
  }
}
