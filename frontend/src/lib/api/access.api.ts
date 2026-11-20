import { authFetch } from './auth-fetch';
import {
  AccessGrant,
  RedeemShareCodeResponse,
  RevokeAccessResponse,
  ShareCodeResponse,
} from './api.type';

export const AccessApi = {
  /** Owner: clinics that can see this pet right now (US-04, D43). */
  listGrants(petId: string) {
    return authFetch<AccessGrant[]>(`/pets/${petId}/access-grants`);
  },

  /** Owner: end every active grant of one clinic, both kinds (D12). */
  revokeClinic(petId: string, clinicId: string) {
    return authFetch<RevokeAccessResponse>(
      `/pets/${petId}/clinics/${clinicId}/access`,
      { method: 'DELETE' },
    );
  },

  /** Owner: new duration for an active owner share, from now (US-04 AC4, D27). */
  extendGrant(grantId: string, durationDays: number | null) {
    return authFetch<AccessGrant>(`/access-grants/${grantId}`, {
      method: 'PATCH',
      body: { durationDays },
    });
  },

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
