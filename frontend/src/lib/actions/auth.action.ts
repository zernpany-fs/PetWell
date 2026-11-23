'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { CredentialsSignin } from 'next-auth';
import { signIn, signOut } from '../auth';
import { AuthApi } from '../api/auth.api';
import { ApiError } from '../api/api-error';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  forgotPasswordSchema,
  resetPasswordSchema,
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
      message: 'Please check the form fields.',
      errors: z.flattenError(parsed.error),
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    await AuthApi.register(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return {
        success: false,
        message: 'Email already in use',
        code: 'EMAIL_EXISTS',
      };
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
      message: 'Please check the form fields.',
      errors: z.flattenError(parsed.error),
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    await AuthApi.registerClinicStaff(parsed.data);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 409) {
      return {
        success: false,
        message: 'Email already in use',
        code: 'EMAIL_EXISTS',
      };
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

// US-07 AC1 (D57): the API answers the same way for every email.
export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    };
  }
  const result = await AuthApi.forgotPassword(parsed.data.email);
  return { success: true, message: result.message };
}

// US-07 AC3, AC4 (D59)
export async function resetPasswordAction(
  token: string,
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
      code: 'VALIDATION_ERROR',
    };
  }
  try {
    const result = await AuthApi.resetPassword(token, parsed.data.password);
    return { success: true, message: result.message };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 400) {
      return { success: false, message: error.message, code: 'INVALID_LINK' };
    }
    throw error;
  }
}
