'use server';

import { revalidatePath } from 'next/cache';
import { ClinicApi } from '../api/clinic.api';
import { ApiError } from '../api/api-error';
import { updateClinicSchema, UpdateClinicInput } from '../schemas/clinic.schema';
import { ActionResult } from './action.type';

export async function updateClinicAction(
  clinicId: string,
  input: UpdateClinicInput,
): Promise<ActionResult> {
  const parsed = updateClinicSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Please check the form fields.', code: 'VALIDATION_ERROR' };
  }
  try {
    await ClinicApi.update(clinicId, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath('/staff/clinic');
  return { success: true, message: 'Clinic profile updated.' };
}
