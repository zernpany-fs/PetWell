import { authFetch } from './auth-fetch';
import { MessageResponse, Pet, PetSearchResult } from './api.type';
import { CreatePetInput, UpdatePetInput } from '../schemas/pet.schema';

export const PetApi = {
  listMine() {
    return authFetch<Pet[]>('/pets');
  },

  search(q: string) {
    return authFetch<PetSearchResult[]>(
      `/pets/search?q=${encodeURIComponent(q)}`,
    );
  },

  get(petId: string) {
    return authFetch<Pet>(`/pets/${petId}`);
  },

  create(data: CreatePetInput) {
    return authFetch<Pet>('/pets', { method: 'POST', body: data });
  },

  update(petId: string, data: UpdatePetInput) {
    return authFetch<Pet>(`/pets/${petId}`, { method: 'PATCH', body: data });
  },

  archive(petId: string) {
    return authFetch<MessageResponse>(`/pets/${petId}`, { method: 'DELETE' });
  },

  uploadPhoto(petId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    return authFetch<{ url: string }>(`/pets/${petId}/photo`, {
      method: 'PATCH',
      body: formData,
    });
  },
};
