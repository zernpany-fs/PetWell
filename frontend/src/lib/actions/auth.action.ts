'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { CredentialsSignin } from 'next-auth';
import { signIn, signOut } from '../auth';
import { AuthApi } from '../api/auth.api';
import { ApiError } from '../api/api-error';
import {
  LoginInput,
  RegisterInput,
  RegisterClinicStaffInput,
  registerSchema,
  registerClinicStaffSchema,
} from '../schemas/auth.schema';
import { ActionResult } from './action.type';

export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: z.flattenError(parsed.error),
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    await AuthApi.register(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return { success: false, message: 'Email already in use', code: 'EMAIL_EXISTS' };
    }
    throw error;
  }
  return { success: true, message: 'Registered successfully. Please log in.' };
}

export async function registerClinicStaffAction(
  input: RegisterClinicStaffInput,
): Promise<ActionResult> {
  const parsed = registerClinicStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: z.flattenError(parsed.error),
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    await AuthApi.registerClinicStaff(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return { success: false, message: 'Email already in use', code: 'EMAIL_EXISTS' };
    }
    throw error;
  }
  return { success: true, message: 'Registered successfully. Please log in.' };
}

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  try {
    await signIn('credentials', { ...input, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return {
        success: false,
        message: 'Email or password is invalid.',
        code: 'INVALID_CREDENTIALS',
      };
    }
    throw error;
  }
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
