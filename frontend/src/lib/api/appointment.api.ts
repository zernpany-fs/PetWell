import { authFetch } from './auth-fetch';
import {
  Appointment,
  AppointmentStatusLog,
  DayAvailability,
  MessageResponse,
} from './api.type';
import {
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from '../schemas/appointment.schema';

export const AppointmentApi = {
  listMine() {
    return authFetch<Appointment[]>('/appointments');
  },

  create(data: CreateAppointmentInput) {
    return authFetch<Appointment>('/appointments', {
      method: 'POST',
      body: data,
    });
  },

  cancel(appointmentId: string) {
    return authFetch<MessageResponse>(`/appointments/${appointmentId}`, {
      method: 'DELETE',
    });
  },

  availability(clinicId: string, date: string) {
    return authFetch<DayAvailability>(
      `/clinics/${clinicId}/availability?date=${encodeURIComponent(date)}`,
      { cache: 'no-store' },
    );
  },

  listByClinic(clinicId: string) {
    return authFetch<Appointment[]>(`/clinics/${clinicId}/appointments`);
  },

  updateStatus(appointmentId: string, data: UpdateAppointmentStatusInput) {
    return authFetch<Appointment>(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: data,
    });
  },

  get(appointmentId: string) {
    return authFetch<Appointment>(`/appointments/${appointmentId}`);
  },

  logs(appointmentId: string) {
    return authFetch<AppointmentStatusLog[]>(
      `/appointments/${appointmentId}/logs`,
    );
  },
};
