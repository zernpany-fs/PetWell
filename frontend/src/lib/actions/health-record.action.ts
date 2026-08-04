'use server';

import { revalidatePath } from 'next/cache';
import { HealthRecordApi } from '../api/health-record.api';
import { ApiError } from '../api/api-error';
import {
  createHealthRecordSchema,
  CreateHealthRecordInput,
} from '../schemas/health-record.schema';
import { ActionResult } from './action.type';

export async function createHealthRecordAction(
  petId: string,
  input: CreateHealthRecordInput,
): Promise<ActionResult> {
  const parsed = createHealthRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: 'Please complete the record form.', code: 'VALIDATION_ERROR' };
  }
  try {
    await HealthRecordApi.create(petId, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath(`/owner/pets/${petId}`);
  revalidatePath(`/staff/pets/${petId}`);
  return { success: true, message: 'Health record added.' };
}
