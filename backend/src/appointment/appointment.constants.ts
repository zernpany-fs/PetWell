import { AppointmentStatus } from '@/database/generated/prisma/enums';

export const MAX_APPOINTMENTS_PER_SLOT = 2;

export const SLOT_DURATION_HOURS = 1;

export const BUSINESS_HOURS = { open: 9, close: 18 } as const;

export const CLINIC_UTC_OFFSET_HOURS = 7;

export const SEAT_CONSUMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
  AppointmentStatus.COMPLETED,
];

export const SLOT_FULL_MESSAGE =
  'This time slot is fully booked. Please choose another time.';

export function toSlotStart(date: Date): Date {
  const slotStart = new Date(date);
  slotStart.setUTCMinutes(0, 0, 0);
  return slotStart;
}

export function toSlotEnd(slotStart: Date): Date {
  const slotEnd = new Date(slotStart);
  slotEnd.setUTCHours(slotEnd.getUTCHours() + SLOT_DURATION_HOURS);
  return slotEnd;
}

export function slotStartFor(date: string, hour: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour - CLINIC_UTC_OFFSET_HOURS, 0, 0, 0),
  );
}

export function businessHours(): number[] {
  const hours: number[] = [];
  for (
    let hour = BUSINESS_HOURS.open;
    hour < BUSINESS_HOURS.close;
    hour += SLOT_DURATION_HOURS
  ) {
    hours.push(hour);
  }
  return hours;
}
