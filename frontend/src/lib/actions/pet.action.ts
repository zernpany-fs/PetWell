'use server';

import { revalidatePath } from 'next/cache';
import { PetApi } from '../api/pet.api';
import { ApiError } from '../api/api-error';
import {
  createPetSchema,
  CreatePetInput,
  updatePetSchema,
  UpdatePetInput,
} from '../schemas/pet.schema';
import { ActionResult } from './action.type';

export async function createPetAction(input: CreatePetInput): Promise<ActionResult> {
  const parsed = createPetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Please check the form fields.', code: 'VALIDATION_ERROR' };
  }
  try {
    await PetApi.create(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
  revalidatePath('/owner/pets');
  revalidatePath('/owner/dashboard');
  return { success: true, message: 'Pet added.' };
}

export async function updatePetAction(
  petId: string,
  input: UpdatePetInput,
): Promise<ActionResult> {
  const parsed = updatePetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Please check the form fields.', code: 'VALIDATION_ERROR' };
  }
  try {
    await PetApi.update(petId, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath(`/owner/pets/${petId}`);
  revalidatePath('/owner/pets');
  return { success: true, message: 'Pet updated.' };
}

export async function uploadPetPhotoAction(
  petId: string,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Please choose an image.', code: 'NO_FILE' };
  }
  try {
    await PetApi.uploadPhoto(petId, file);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath(`/owner/pets/${petId}`);
  revalidatePath('/owner/pets');
  return { success: true, message: 'Photo updated.' };
}

export async function archivePetAction(petId: string): Promise<ActionResult> {
  try {
    await PetApi.archive(petId);
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
  revalidatePath('/owner/pets');
  return { success: true, message: 'Pet archived.' };
}
