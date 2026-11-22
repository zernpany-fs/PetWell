import { createHash, randomBytes } from 'node:crypto';

const MINUTE_MS = 60 * 1000;

// D56: a link is valid for 30 minutes.
export const RESET_TOKEN_TTL_MS = 30 * MINUTE_MS;
// D58: at most 3 links per account per rolling hour.
export const RESET_REQUEST_LIMIT = 3;
export const RESET_REQUEST_WINDOW_MS = 60 * MINUTE_MS;

// D57 and D59: one message each, whatever the reason.
export const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, we have sent a reset link.';
export const INVALID_RESET_LINK_MESSAGE =
  'This reset link is invalid or has expired.';

/** D56: 32 random bytes, URL-safe. Only its hash is stored. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * D56: plain SHA-256. The token has 256 random bits, so no secret is
 * needed to stop guessing (unlike the 6-digit share code, D26).
 */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resetLink(frontendUrl: string, token: string): string {
  return `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
}
