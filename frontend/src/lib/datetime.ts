import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';

/**
 * D68: PetWell clinics are in Thailand and opening hours are in Thai time,
 * so every time is shown in Asia/Bangkok — never in the time zone of the
 * machine that renders the page (Vercel servers run in UTC).
 */
export const APP_TIME_ZONE = 'Asia/Bangkok';

function inAppZone(value: string | Date): TZDate {
  return new TZDate(new Date(value).getTime(), APP_TIME_ZONE);
}

/** date-fns `format`, but in Thai time. */
export function formatAppTime(value: string | Date, pattern: string): string {
  return format(inAppZone(value), pattern);
}

/** Is `value` on the same Thai calendar day as `now`? */
export function isTodayInApp(
  value: string | Date,
  now: Date = new Date(),
): boolean {
  return (
    formatAppTime(value, 'yyyy-MM-dd') === formatAppTime(now, 'yyyy-MM-dd')
  );
}
