import { describe, expect, it } from 'vitest';
import {
  AppointmentStatus,
  GrantEndReason,
} from '@/database/generated/prisma/enums';
import { decideGrantChange } from './grant-decision';

// Rows follow docs/v2/PetWell_Appointment_Grant_Flow (+ D28 for legacy data).

// Fixed clock so results never depend on when the tests run.
const NOW = new Date('2026-11-11T10:00:00Z');
const EARLIER = new Date('2026-11-05T10:00:00Z');

const NO_GRANT = null;
const ACTIVE_GRANT = { endedAt: null, expiresAt: null };
const REVOKED_GRANT = { endedAt: EARLIER, expiresAt: null };

describe('decideGrantChange', () => {
  describe('CONFIRMED', () => {
    it('creates a grant when none exists (D1)', () => {
      expect(
        decideGrantChange(AppointmentStatus.CONFIRMED, NO_GRANT, NOW),
      ).toEqual({ action: 'CREATE' });
    });

    it('does not create a duplicate when a grant is active (US-01 AC3)', () => {
      expect(
        decideGrantChange(AppointmentStatus.CONFIRMED, ACTIVE_GRANT, NOW),
      ).toEqual({ action: 'NONE' });
    });

    it('does not give back access that was revoked (D13)', () => {
      expect(
        decideGrantChange(AppointmentStatus.CONFIRMED, REVOKED_GRANT, NOW),
      ).toEqual({ action: 'NONE' });
    });
  });

  describe('RESCHEDULED', () => {
    it.each([
      ['no grant', NO_GRANT],
      ['an active grant', ACTIVE_GRANT],
      ['a revoked grant', REVOKED_GRANT],
    ])('changes nothing with %s (US-01 AC3)', (_label, grant) => {
      expect(
        decideGrantChange(AppointmentStatus.RESCHEDULED, grant, NOW),
      ).toEqual({ action: 'NONE' });
    });
  });

  describe('COMPLETED', () => {
    it('sets expiresAt to now + 30 days on an active grant (D2, D23)', () => {
      expect(
        decideGrantChange(AppointmentStatus.COMPLETED, ACTIVE_GRANT, NOW),
      ).toEqual({
        action: 'SET_EXPIRY',
        expiresAt: new Date('2026-12-11T10:00:00Z'),
      });
    });

    it('does not reopen an ended grant (D23)', () => {
      expect(
        decideGrantChange(AppointmentStatus.COMPLETED, REVOKED_GRANT, NOW),
      ).toEqual({ action: 'NONE' });
    });

    it('changes nothing when no grant exists, e.g. legacy v1 data (D28)', () => {
      expect(
        decideGrantChange(AppointmentStatus.COMPLETED, NO_GRANT, NOW),
      ).toEqual({ action: 'NONE' });
    });
  });

  describe.each([
    [AppointmentStatus.REJECTED, GrantEndReason.REJECTED],
    [AppointmentStatus.CANCELLED, GrantEndReason.CANCELLED],
  ])('%s', (status, endReason) => {
    it('ends an active grant with the matching reason (D4)', () => {
      expect(decideGrantChange(status, ACTIVE_GRANT, NOW)).toEqual({
        action: 'END',
        endReason,
      });
    });

    it('keeps REVOKED on a grant revoked earlier (D12)', () => {
      expect(decideGrantChange(status, REVOKED_GRANT, NOW)).toEqual({
        action: 'NONE',
      });
    });

    it('changes nothing when no grant exists, e.g. cancelled while PENDING', () => {
      expect(decideGrantChange(status, NO_GRANT, NOW)).toEqual({
        action: 'NONE',
      });
    });
  });
});
