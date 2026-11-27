'use server';

import { revalidatePath } from 'next/cache';
import { ClinicApi } from '../api/clinic.api';
import { ApiError } from '../api/api-error';
import { StaffDecision } from '../api/api.type';
import { ActionResult } from './action.type';

/** US-09 AC4–AC6 (D76): approve or reject a staff sign-up of my clinic. */
export async function decideStaffRequestAction(
  userId: string,
  decision: StaffDecision,
): Promise<ActionResult> {
  try {
    const { message } = await ClinicApi.decideStaffRequest(userId, decision);
    revalidatePath('/staff/clinic');
    return { success: true, message };
  } catch (error) {
    // 404: not a request of this clinic; 409: someone decided it first.
    if (error instanceof ApiError) {
      revalidatePath('/staff/clinic');
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
}
