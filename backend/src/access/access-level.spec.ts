import { describe, expect, it } from 'vitest';
import { isGrantActive, resolveAccessLevel } from './access-level';

// Fixed clock so results never depend on when the tests run.
const NOW = new Date('2026-11-11T10:00:00Z');
const PAST = new Date('2026-11-01T10:00:00Z');
const FUTURE = new Date('2026-12-01T10:00:00Z');
const LATER_FUTURE = new Date('2027-01-01T10:00:00Z');

// Builds a grant snapshot; anything not given is "open, no expiry".
function grant(
  id: string,
  fields: Partial<{ endedAt: Date; expiresAt: Date; createdAt: Date }> = {},
) {
  return {
    id,
    endedAt: fields.endedAt ?? null,
    expiresAt: fields.expiresAt ?? null,
    createdAt: fields.createdAt ?? PAST,
  };
}

describe('isGrantActive', () => {
  it('is active when not ended and with no expiry', () => {
    expect(isGrantActive(grant('g1'), NOW)).toBe(true);
  });

  it('is active when the expiry is still in the future', () => {
    expect(isGrantActive(grant('g1', { expiresAt: FUTURE }), NOW)).toBe(true);
  });

  it('is not active once ended', () => {
    expect(isGrantActive(grant('g1', { endedAt: PAST }), NOW)).toBe(false);
  });

  it('is not active once ended, even if expiry is in the future', () => {
    expect(
      isGrantActive(grant('g1', { endedAt: PAST, expiresAt: FUTURE }), NOW),
    ).toBe(false);
  });

  it('is not active when the expiry has passed (D2)', () => {
    expect(isGrantActive(grant('g1', { expiresAt: PAST }), NOW)).toBe(false);
  });

  it('is not active at the exact moment of expiry', () => {
    expect(isGrantActive(grant('g1', { expiresAt: NOW }), NOW)).toBe(false);
  });
});

describe('resolveAccessLevel', () => {
  describe('levels (D5, D6, D11, D20)', () => {
    it('gives FULL access with an active grant', () => {
      expect(resolveAccessLevel([grant('g1')], false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'g1',
      });
    });

    it('prefers FULL over AUTHORED_ONLY when both apply', () => {
      expect(resolveAccessLevel([grant('g1')], true, NOW)).toEqual({
        level: 'FULL',
        grantId: 'g1',
      });
    });

    it('gives AUTHORED_ONLY with no grants but authored records', () => {
      expect(resolveAccessLevel([], true, NOW)).toEqual({
        level: 'AUTHORED_ONLY',
      });
    });

    it('gives AUTHORED_ONLY after all grants ended or expired (D11)', () => {
      const grants = [
        grant('g1', { endedAt: PAST }),
        grant('g2', { expiresAt: PAST }),
      ];
      expect(resolveAccessLevel(grants, true, NOW)).toEqual({
        level: 'AUTHORED_ONLY',
      });
    });

    it('gives NONE with no grants and no authored records', () => {
      expect(resolveAccessLevel([], false, NOW)).toEqual({ level: 'NONE' });
    });

    it('gives NONE when only ended or expired grants remain', () => {
      const grants = [
        grant('g1', { endedAt: PAST }),
        grant('g2', { expiresAt: PAST }),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({ level: 'NONE' });
    });
  });

  describe('which grant is logged when several are active (D29)', () => {
    it('picks the grant that expires last', () => {
      const grants = [
        grant('soon', { expiresAt: FUTURE }),
        grant('later', { expiresAt: LATER_FUTURE }),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'later',
      });
    });

    it('treats no expiry as expiring last', () => {
      const grants = [
        grant('dated', { expiresAt: LATER_FUTURE }),
        grant('unlimited'),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'unlimited',
      });
    });

    it('breaks a tie between two unlimited grants by newest', () => {
      const grants = [
        grant('older', { createdAt: PAST }),
        grant('newer', { createdAt: NOW }),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'newer',
      });
    });

    it('breaks a tie on the same expiry by newest', () => {
      const grants = [
        grant('newer', { expiresAt: FUTURE, createdAt: NOW }),
        grant('older', { expiresAt: FUTURE, createdAt: PAST }),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'newer',
      });
    });

    it('ignores an ended grant even if it would expire last', () => {
      const grants = [
        grant('active', { expiresAt: FUTURE }),
        grant('revoked', { endedAt: PAST }),
      ];
      expect(resolveAccessLevel(grants, false, NOW)).toEqual({
        level: 'FULL',
        grantId: 'active',
      });
    });
  });
});
