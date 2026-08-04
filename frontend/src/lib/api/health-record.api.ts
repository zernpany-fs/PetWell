import { authFetch } from './auth-fetch';
import { HealthRecord, MessageResponse } from './api.type';
import {
  CreateHealthRecordInput,
  UpdateHealthRecordInput,
} from '../schemas/health-record.schema';

export const HealthRecordApi = {
  listByPet(petId: string) {
    return authFetch<HealthRecord[]>(`/pets/${petId}/health-records`);
  },

  get(recordId: string) {
    return authFetch<HealthRecord>(`/health-records/${recordId}`);
  },

  create(petId: string, data: CreateHealthRecordInput) {
    return authFetch<HealthRecord>(`/pets/${petId}/health-records`, {
      method: 'POST',
      body: data,
    });
  },

  update(recordId: string, data: UpdateHealthRecordInput) {
    return authFetch<HealthRecord>(`/health-records/${recordId}`, {
      method: 'PATCH',
      body: data,
    });
  },

  archive(recordId: string) {
    return authFetch<MessageResponse>(`/health-records/${recordId}`, {
      method: 'DELETE',
    });
  },

  uploadAttachment(recordId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return authFetch<{ url: string }>(
      `/health-records/${recordId}/attachments`,
      { method: 'POST', body: formData },
    );
  },
};
