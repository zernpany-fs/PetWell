import { ApiError } from './api/api-error';

// Must match STAFF_REJECTED_MESSAGE in backend/src/auth/auth.service.ts.
const BACKEND_REJECTED = 'This staff account was not approved';

export type LoginErrorCode = 'staff_pending' | 'staff_rejected';

/**
 * US-09 AC2/AC5 (D74): the API answers 403 only after a right password, for
 * staff the clinic has not approved. Other errors stay "invalid" (null).
 */
export function staffLoginCode(error: unknown): LoginErrorCode | null {
  if (!(error instanceof ApiError) || error.statusCode !== 403) return null;
  return error.message === BACKEND_REJECTED
    ? 'staff_rejected'
    : 'staff_pending';
}

export const LOGIN_MESSAGES: Record<LoginErrorCode, string> = {
  staff_pending:
    'Your clinic has not approved this account yet. Ask a staff member of your clinic to approve it under Clinic Profile.',
  staff_rejected: 'Your clinic did not approve this staff account.',
};
