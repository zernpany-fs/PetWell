import { authFetch } from './auth-fetch';
import { UserResponse } from './api.type';
import { UpdateProfileInput } from '../schemas/user.schema';

export const UserApi = {
  updateProfile(data: UpdateProfileInput) {
    return authFetch<UserResponse>('/users/me', {
      method: 'PATCH',
      body: data,
    });
  },

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return authFetch<string>('/users/me/avatar', {
      method: 'PATCH',
      body: formData,
    });
  },

  uploadCover(file: File) {
    const formData = new FormData();
    formData.append('cover', file);
    return authFetch<string>('/users/me/cover', {
      method: 'PATCH',
      body: formData,
    });
  },
};
