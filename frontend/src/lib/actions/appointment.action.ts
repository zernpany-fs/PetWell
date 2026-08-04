'use server';

import { revalidatePath } from 'next/cache';
import { AppointmentApi } from '../api/appointment.api';
import { ApiError } from '../api/api-error';
import { DayAvailability } from '../api/api.type';
import {
  createAppointmentSchema,
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from '../schemas/appointment.schema';
import { ActionResult } from './action.type';

export async function bookAppointmentAction(
  input: CreateAppointmentInput,
): Promise<ActionResult> {
  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Please complete the booking form.';
    return { success: false, message, code: 'VALIDATION_ERROR' };
  }
  try {
    await AppointmentApi.create(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath('/owner/appointments');
  revalidatePath('/owner/dashboard');
  return { success: true, message: 'Appointment requested.' };
}

export async function getSlotAvailabilityAction(
  clinicId: string,
  date: string,
): Promise<DayAvailability | null> {
  try {
    return await AppointmentApi.availability(clinicId, date);
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

export async function cancelAppointmentAction(id: string): Promise<ActionResult> {
  try {
    await AppointmentApi.cancel(id);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath('/owner/appointments');
  revalidatePath(`/owner/appointments/${id}`);
  revalidatePath('/owner/dashboard');
  return { success: true, message: 'Appointment cancelled.' };
}

export async function updateAppointmentStatusAction(
  id: string,
  data: UpdateAppointmentStatusInput,
): Promise<ActionResult> {
  try {
    await AppointmentApi.updateStatus(id, data);
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidatePath('/staff/appointments');
  revalidatePath(`/staff/appointments/${id}`);
  revalidatePath('/staff/dashboard');
  return { success: true, message: `Marked as ${data.status.toLowerCase()}.` };
}
