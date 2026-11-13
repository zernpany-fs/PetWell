const MINUTE_MS = 60 * 1000;

export type LockoutRule = {
  maxFailures: number; // this many failures...
  windowMs: number; // ...within this window...
  lockMs: number; // ...block for this long after the last of them
};

// D14 + D40: 5 failures in 15 minutes per staff account.
export const ACCOUNT_LOCKOUT: LockoutRule = {
  maxFailures: 5,
  windowMs: 15 * MINUTE_MS,
  lockMs: 15 * MINUTE_MS,
};

// D14: 10 failures in one hour per clinic, all accounts together.
export const CLINIC_LOCKOUT: LockoutRule = {
  maxFailures: 10,
  windowMs: 60 * MINUTE_MS,
  lockMs: 15 * MINUTE_MS,
};

/** How far back failures can still matter for `rule`. */
export function lookbackMs(rule: LockoutRule): number {
  return rule.windowMs + rule.lockMs;
}

/**
 * When the lock ends, or null if not locked now.
 * Locked when `maxFailures` failures fall within `windowMs`; the lock lasts
 * `lockMs` from the failure that reached the limit. Attempts made while
 * locked are not recorded (D40), so they cannot extend the lock.
 */
export function lockedUntil(
  failures: Date[],
  rule: LockoutRule,
  now: Date,
): Date | null {
  const times = failures.map((f) => f.getTime()).sort((a, b) => a - b);
  let until: number | null = null;

  for (let i = rule.maxFailures - 1; i < times.length; i++) {
    const first = times[i - rule.maxFailures + 1];
    if (times[i] - first > rule.windowMs) continue;
    const end = times[i] + rule.lockMs;
    if (end > now.getTime() && (until === null || end > until)) {
      until = end;
    }
  }

  return until === null ? null : new Date(until);
}
