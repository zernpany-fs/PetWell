import { apiFetch } from './api-fetch';
import { authFetch } from './auth-fetch';
import {
  Clinic,
  ClinicType,
  MessageResponse,
  StaffDecision,
  StaffRequest,
} from './api.type';
import { UpdateClinicInput } from '../schemas/clinic.schema';

export const ClinicApi = {
  list(params?: { search?: string; type?: ClinicType }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.type) qs.set('type', params.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<Clinic[]>(`/clinics${suffix}`);
  },

  get(clinicId: string) {
    return apiFetch<Clinic>(`/clinics/${clinicId}`);
  },

  update(clinicId: string, data: UpdateClinicInput) {
    return authFetch<Clinic>(`/clinics/${clinicId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  // US-08: staff upload their clinic's photo.
  uploadPhoto(clinicId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return authFetch<{ url: string }>(`/clinics/${clinicId}/photo`, {
      method: 'PATCH',
      body: formData,
    });
  },

  // US-09 (D76): pending staff sign-ups of the signed-in staff's clinic.
  listStaffRequests() {
    return authFetch<StaffRequest[]>('/clinics/me/staff-requests');
  },

  decideStaffRequest(userId: string, decision: StaffDecision) {
    return authFetch<MessageResponse>(`/clinics/me/staff-requests/${userId}`, {
      method: 'PATCH',
      body: { decision },
    });
  },
};
