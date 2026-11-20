import { describe, expect, it } from 'vitest';
import { ACCOUNT_LOCKOUT, CLINIC_LOCKOUT, lockedUntil } from './lockout';

// Fixed clock so results never depend on when the tests run.
const NOW = new Date('2026-11-13T10:00:00Z');

// A failure `minutesAgo` minutes before NOW.
function ago(minutesAgo: number): Date {
  return new Date(NOW.getTime() - minutesAgo * 60 * 1000);
}

// `count` failures, one minute apart, the last one `lastMinutesAgo` ago.
function failures(count: number, lastMinutesAgo: number): Date[] {
  return Array.from({ length: count }, (_, i) =>
    ago(lastMinutesAgo + (count - 1 - i)),
  );
}

describe('lockedUntil — staff account (5 in 15 min, D14)', () => {
  it('is not locked with no failures', () => {
    expect(lockedUntil([], ACCOUNT_LOCKOUT, NOW)).toBeNull();
  });

  it('is not locked after 4 failures', () => {
    expect(lockedUntil(failures(4, 0), ACCOUNT_LOCKOUT, NOW)).toBeNull();
  });

  it('locks for 15 minutes from the 5th failure', () => {
    const until = lockedUntil(failures(5, 2), ACCOUNT_LOCKOUT, NOW);
    expect(until).toEqual(new Date(ago(2).getTime() + 15 * 60 * 1000));
  });

  it('is unlocked exactly 15 minutes after the 5th failure', () => {
    expect(lockedUntil(failures(5, 15), ACCOUNT_LOCKOUT, NOW)).toBeNull();
  });

  it('does not lock when 5 failures are spread over more than 15 minutes', () => {
    const spread = [ago(20), ago(15), ago(10), ago(5), ago(0)];
    expect(lockedUntil(spread, ACCOUNT_LOCKOUT, NOW)).toBeNull();
  });

  it('handles failures given in any order', () => {
    const shuffled = [ago(1), ago(3), ago(0), ago(4), ago(2)];
    expect(lockedUntil(shuffled, ACCOUNT_LOCKOUT, NOW)).toEqual(
      new Date(NOW.getTime() + 15 * 60 * 1000),
    );
  });
});

describe('lockedUntil — clinic (10 in 1 hour, D14)', () => {
  it('is not locked after 9 failures', () => {
    expect(lockedUntil(failures(9, 0), CLINIC_LOCKOUT, NOW)).toBeNull();
  });

  it('locks when 10 failures fall within one hour', () => {
    const tenInAnHour = Array.from({ length: 10 }, (_, i) => ago(54 - i * 6));
    // Last failure was 0 minutes ago, so locked for 15 more minutes.
    expect(lockedUntil(tenInAnHour, CLINIC_LOCKOUT, NOW)).toEqual(
      new Date(NOW.getTime() + 15 * 60 * 1000),
    );
  });

  it('does not lock when 10 failures span more than one hour', () => {
    const tenOverTwoHours = Array.from({ length: 10 }, (_, i) =>
      ago(108 - i * 12),
    );
    expect(lockedUntil(tenOverTwoHours, CLINIC_LOCKOUT, NOW)).toBeNull();
  });
});
