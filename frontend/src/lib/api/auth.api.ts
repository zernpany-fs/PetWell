import {
  LoginInput,
  RegisterInput,
  RegisterClinicStaffInput,
} from '../schemas/auth.schema';
import { apiFetch } from './api-fetch';
import { LoginResponse, MessageResponse, UserResponse } from './api.type';

export const AuthApi = {
  register(data: RegisterInput) {
    return apiFetch<MessageResponse>('/auth/register', {
      method: 'POST',
      body: data,
    });
  },

  registerClinicStaff(data: RegisterClinicStaffInput) {
    return apiFetch<MessageResponse>('/auth/register/clinic-staff', {
      method: 'POST',
      body: data,
    });
  },

  login(data: LoginInput) {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: data,
    });
  },

  forgotPassword(email: string) {
    return apiFetch<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  },

  resetPassword(token: string, password: string) {
    return apiFetch<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    });
  },

  me(token: string) {
    return apiFetch<UserResponse>('/auth/me', { token });
  },
};
