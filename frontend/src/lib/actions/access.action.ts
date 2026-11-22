'use server';

import { revalidatePath } from 'next/cache';
import { AccessApi } from '../api/access.api';
import { ApiError } from '../api/api-error';
import {
  redeemShareCodeSchema,
  RedeemShareCodeInput,
  shareDurationSchema,
  ShareDurationInput,
} from '../schemas/access.schema';
import { ShareCodeResponse } from '../api/api.type';
import { ActionResult } from './action.type';

// On success the form shows the code once, so it needs the whole response.
export type GenerateShareCodeResult =
  | { success: true; shareCode: ShareCodeResponse }
  | Extract<ActionResult, { success: false }>;

export async function generateShareCodeAction(
  petId: string,
  input: ShareDurationInput,
): Promise<GenerateShareCodeResult> {
  const parsed = shareDurationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    const shareCode = await AccessApi.generate(petId, parsed.data.durationDays);
    // Nothing on the page changes until a clinic redeems the code,
    // so there is no revalidatePath here.
    return { success: true, shareCode };
  } catch (error) {
    // 404: not this owner's pet (or archived).
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
}

/** US-04 AC4, D27: owner shares only; counted from now. */
export async function extendGrantAction(
  petId: string,
  grantId: string,
  input: ShareDurationInput,
): Promise<ActionResult> {
  const parsed = shareDurationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    await AccessApi.extendGrant(grantId, parsed.data.durationDays);
    revalidatePath(`/owner/pets/${petId}`);
    return { success: true, message: 'Access updated.' };
  } catch (error) {
    // 409: already ended or not an owner share (D44); refresh the list.
    if (error instanceof ApiError) {
      revalidatePath(`/owner/pets/${petId}`);
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
}

/** US-04 AC1–AC2: the clinic loses both kinds of access (D12). */
export async function revokeClinicAccessAction(
  petId: string,
  clinicId: string,
): Promise<ActionResult> {
  try {
    await AccessApi.revokeClinic(petId, clinicId);
    revalidatePath(`/owner/pets/${petId}`);
    return { success: true, message: 'Access revoked.' };
  } catch (error) {
    // 404: the access already ended (e.g. expired); refresh the list.
    if (error instanceof ApiError) {
      revalidatePath(`/owner/pets/${petId}`);
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
}

// On success the form opens the pet, so it needs the pet's id.
export type RedeemShareCodeResult =
  | { success: true; message: string; petId: string }
  | Extract<ActionResult, { success: false }>;

export async function redeemShareCodeAction(
  input: RedeemShareCodeInput,
): Promise<RedeemShareCodeResult> {
  const parsed = redeemShareCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    const result = await AccessApi.redeem(parsed.data.code);
    // The clinic can now find this pet in search.
    revalidatePath('/staff/pets');
    return {
      success: true,
      message: `Access granted to ${result.pet.name}.`,
      petId: result.pet.id,
    };
  } catch (error) {
    // 400: wrong, expired or used code. 429: locked, with minutes left (D42).
    if (error instanceof ApiError) {
      return { success: false, message: error.message, code: 'API_ERROR' };
    }
    throw error;
  }
}
