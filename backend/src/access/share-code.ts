import { createHmac, randomInt } from 'node:crypto';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// D7: 6 digits, valid for 15 minutes.
export const SHARE_CODE_LENGTH = 6;
export const SHARE_CODE_TTL_MS = 15 * MINUTE_MS;

// D3: share durations in days; null = unlimited.
export const SHARE_DURATIONS = [7, 30, 90, null] as const;
export type ShareDuration = (typeof SHARE_DURATIONS)[number];

type RandomInt = (min: number, max: number) => number;

/** A random 6-digit code, leading zeros kept ("004217"). D26: crypto.randomInt. */
export function generateShareCode(random: RandomInt = randomInt): string {
  return random(0, 10 ** SHARE_CODE_LENGTH)
    .toString()
    .padStart(SHARE_CODE_LENGTH, '0');
}

/**
 * D26: HMAC-SHA256 with SHARE_CODE_SECRET. The same code always gives the
 * same hash, so redeeming is a direct lookup, but without the secret the
 * 1,000,000 possible codes cannot be tried against a leaked table.
 */
export function hashShareCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex');
}

/** When an owner-share grant ends, counted from `from` (D27, D41). */
export function shareExpiry(
  durationDays: number | null,
  from: Date,
): Date | null {
  return durationDays === null
    ? null
    : new Date(from.getTime() + durationDays * DAY_MS);
}
