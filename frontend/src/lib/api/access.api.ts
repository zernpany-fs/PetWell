import { authFetch } from './auth-fetch';
import { RedeemShareCodeResponse } from './api.type';

export const AccessApi = {
  /** Clinic staff: enter an owner's 6-digit code to get access (US-03). */
  redeem(code: string) {
    return authFetch<RedeemShareCodeResponse>('/share-codes/redeem', {
      method: 'POST',
      body: { code },
    });
  },
};
