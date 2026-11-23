// D68: every time shown in the app is Thai time (Asia/Bangkok), whatever
// time zone the server or browser runs in. Vercel servers run in UTC.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { formatAppTime, isTodayInApp } from '../datetime';

let savedTz: string | undefined;
beforeEach(() => {
  savedTz = process.env.TZ;
  process.env.TZ = 'UTC'; // like the live demo's server
});
afterEach(() => {
  process.env.TZ = savedTz;
});

// 10:00 in Bangkok on 30 Nov 2026, as the API sends it.
const BOOKED_10AM = '2026-11-30T03:00:00.000Z';

describe('formatAppTime (D68)', () => {
  it('shows the Bangkok time on a UTC server', () => {
    expect(formatAppTime(BOOKED_10AM, 'EEE d MMM yyyy, HH:mm')).toBe(
      'Mon 30 Nov 2026, 10:00',
    );
  });

  it('plain date-fns shows the bug this fixes', () => {
    expect(format(new Date(BOOKED_10AM), 'HH:mm')).toBe('03:00');
  });

  it('moves to the next day when Bangkok has passed midnight', () => {
    // 18:30 UTC = 01:30 the next day in Bangkok
    expect(formatAppTime('2026-11-30T18:30:00.000Z', 'd MMM yyyy, HH:mm')).toBe(
      '1 Dec 2026, 01:30',
    );
  });

  it('keeps date-only values (record dates) on the same day', () => {
    expect(formatAppTime('2026-01-05T00:00:00.000Z', 'd MMM yyyy')).toBe(
      '5 Jan 2026',
    );
  });

  it('accepts a Date as well as a string', () => {
    expect(formatAppTime(new Date(BOOKED_10AM), 'HH:mm')).toBe('10:00');
  });
});

describe('isTodayInApp (D68)', () => {
  it('compares days in Bangkok, not on the server', () => {
    const now = new Date('2026-11-30T20:00:00.000Z'); // 03:00 on 1 Dec in Bangkok
    expect(isTodayInApp('2026-12-01T02:00:00.000Z', now)).toBe(true); // 09:00 on 1 Dec
    expect(isTodayInApp('2026-11-30T10:00:00.000Z', now)).toBe(false); // 17:00 on 30 Nov
  });
});
