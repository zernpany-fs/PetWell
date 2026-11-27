// US-09 AC2/AC5 (D74): login message for staff the clinic has not approved.
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/api-error';
import { staffLoginCode } from '../auth-errors';

describe('staffLoginCode (D74)', () => {
  it('pending staff (403) -> staff_pending', () => {
    const e = new ApiError(
      403,
      'Your clinic has not approved this account yet',
    );
    expect(staffLoginCode(e)).toBe('staff_pending');
  });

  it('rejected staff (403) -> staff_rejected', () => {
    const e = new ApiError(403, 'This staff account was not approved');
    expect(staffLoginCode(e)).toBe('staff_rejected');
  });

  it('wrong password (401) and other errors stay the usual invalid login', () => {
    expect(
      staffLoginCode(new ApiError(401, 'Invalid email or password')),
    ).toBeNull();
    expect(staffLoginCode(new Error('network'))).toBeNull();
  });
});
