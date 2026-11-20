import { authFetch } from './auth-fetch';
import { RedeemShareCodeResponse, ShareCodeResponse } from './api.type';

export const AccessApi = {
  /**
   * Owner: create a 6-digit code for one pet (US-03 AC1).
   * durationDays must always be sent; null = unlimited (D41).
   */
  generate(petId: string, durationDays: number | null) {
    return authFetch<ShareCodeResponse>(`/pets/${petId}/share-codes`, {
      method: 'POST',
      body: { durationDays },
    });
  },

  /** Clinic staff: enter an owner's 6-digit code to get access (US-03). */
  redeem(code: string) {
    return authFetch<RedeemShareCodeResponse>('/share-codes/redeem', {
      method: 'POST',
      body: { code },
    });
  },
};
