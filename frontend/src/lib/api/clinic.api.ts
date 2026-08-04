import { apiFetch } from './api-fetch';
import { authFetch } from './auth-fetch';
import { Clinic, ClinicType } from './api.type';
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
};
