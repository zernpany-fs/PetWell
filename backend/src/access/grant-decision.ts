import {
  AppointmentStatus,
  GrantEndReason,
} from '@/database/generated/prisma/enums';

// D2: appointment access lasts until COMPLETED + 30 days.
export const APPOINTMENT_GRANT_DAYS_AFTER_COMPLETED = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Only the fields the decision needs; null = no grant for this appointment yet.
export type ExistingGrant = {
  endedAt: Date | null;
  expiresAt: Date | null;
} | null;

export type GrantChange =
  | { action: 'CREATE' }
  | { action: 'SET_EXPIRY'; expiresAt: Date }
  | { action: 'END'; endReason: GrantEndReason }
  | { action: 'NONE' };

const NO_CHANGE: GrantChange = { action: 'NONE' };

/**
 * Decides how an appointment's access grant changes when the appointment
 * moves to `newStatus`. Pure: no database, no clock (the caller passes `now`).
 * Follows docs/v2/PetWell_Appointment_Grant_Flow.
 */
export function decideGrantChange(
  newStatus: AppointmentStatus,
  grant: ExistingGrant,
  now: Date,
): GrantChange {
  // Expiry is only set on COMPLETED (a final status), so endedAt alone
  // tells us whether the grant is still open at this point.
  const isOpen = grant !== null && grant.endedAt === null;

  switch (newStatus) {
    case AppointmentStatus.CONFIRMED:
      // D1: first confirmation creates the grant.
      // D13 / US-01 AC3: never duplicate, never reopen a revoked grant.
      return grant === null ? { action: 'CREATE' } : NO_CHANGE;

    case AppointmentStatus.COMPLETED:
      // D2, D23: start the 30-day countdown only on an open grant.
      // D28: no grant (legacy v1 data) means no change.
      if (!isOpen) return NO_CHANGE;
      return {
        action: 'SET_EXPIRY',
        expiresAt: new Date(
          now.getTime() + APPOINTMENT_GRANT_DAYS_AFTER_COMPLETED * DAY_MS,
        ),
      };

    case AppointmentStatus.REJECTED:
    case AppointmentStatus.CANCELLED:
      // D4: end an open grant with the same reason.
      // D12: a grant revoked earlier keeps REVOKED.
      if (!isOpen) return NO_CHANGE;
      return {
        action: 'END',
        endReason:
          newStatus === AppointmentStatus.REJECTED
            ? GrantEndReason.REJECTED
            : GrantEndReason.CANCELLED,
      };

    default:
      // RESCHEDULED keeps the grant as is (US-01 AC3); PENDING never
      // happens as a new status.
      return NO_CHANGE;
  }
}
