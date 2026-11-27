import { Appointment, HealthRecord } from './api/api.type';
import { formatAppTime } from './datetime';

/** D70: a vaccine is "due soon" from today up to this many days ahead. */
export const REMINDER_WINDOW_DAYS = 14;

const UPCOMING_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];
const DAY_MS = 86_400_000;

export type VaccineReminder = {
  petId: string;
  petName: string;
  recordId: string;
  description: string;
  nextDueDate: string;
  daysLeft: number;
};

/** A calendar day (yyyy-MM-dd) as a whole number of days, no time zone. */
function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function todayInApp(now: Date): number {
  return dayNumber(formatAppTime(now, 'yyyy-MM-dd'));
}

/**
 * D70: vaccine records whose next due date is today or within the next
 * REMINDER_WINDOW_DAYS days (Thai calendar day), soonest first.
 * Overdue dates are left out: a record has no vaccine name, so the app
 * cannot tell whether a later record already covers it.
 */
export function getVaccineReminders(
  pets: { id: string; name: string }[],
  recordsByPet: Record<string, HealthRecord[]>,
  now: Date = new Date(),
): VaccineReminder[] {
  const today = todayInApp(now);
  const reminders: VaccineReminder[] = [];
  for (const pet of pets) {
    for (const r of recordsByPet[pet.id] ?? []) {
      if (r.recordType !== 'VACCINE' || !r.isActive || !r.nextDueDate) continue;
      const daysLeft = dayNumber(r.nextDueDate) - today;
      if (daysLeft < 0 || daysLeft > REMINDER_WINDOW_DAYS) continue;
      reminders.push({
        petId: pet.id,
        petName: pet.name,
        recordId: r.id,
        description: r.description,
        nextDueDate: r.nextDueDate,
        daysLeft,
      });
    }
  }
  return reminders.sort(
    (a, b) => a.daysLeft - b.daysLeft || a.petName.localeCompare(b.petName),
  );
}

/**
 * D71: an appointment is upcoming when it is still open (pending, confirmed
 * or rescheduled) and its Thai calendar day is today or later. Open
 * appointments from past days are not shown as upcoming. Soonest first.
 */
export function getUpcomingAppointments(
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment[] {
  const today = todayInApp(now);
  return appointments
    .filter(
      (a) =>
        UPCOMING_STATUSES.includes(a.status) &&
        dayNumber(formatAppTime(a.appointmentDate, 'yyyy-MM-dd')) >= today,
    )
    .sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() -
        new Date(b.appointmentDate).getTime(),
    );
}
