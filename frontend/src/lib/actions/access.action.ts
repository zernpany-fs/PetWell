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
    const shareCode = await AccessApi.generate(
      petId,
      parsed.data.durationDays,
    );
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
