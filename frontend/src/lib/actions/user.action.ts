'use server';

import { revalidatePath } from 'next/cache';
import { UserApi } from '../api/user.api';
import { ApiError } from '../api/api-error';
import { auth, unstable_update } from '../auth';
import { updateProfileSchema, UpdateProfileInput } from '../schemas/user.schema';
import { ActionResult } from './action.type';

function revalidateShell() {
  revalidatePath('/owner', 'layout');
  revalidatePath('/staff', 'layout');
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Please check the form fields.';
    return { success: false, message, code: 'VALIDATION_ERROR' };
  }
  try {
    const updated = await UserApi.updateProfile(parsed.data);
    // The header reads the name from the next-auth token, not from /auth/me,
    // so without this the shell keeps showing whatever was current at login.
    // Values come from the API response rather than the form input, so any
    // server-side trimming is reflected too.
    await unstable_update({
      user: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidateShell();
  return { success: true, message: 'Profile updated.' };
}

export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Please choose an image.', code: 'NO_FILE' };
  }
  try {
    const url = await UserApi.uploadAvatar(file);
    const session = await auth();
    if (session?.user) {
      await unstable_update({
        user: { id: session.user.id, avatarUrl: url },
      });
    }
  } catch (error) {
    if (error instanceof ApiError) return { success: false, message: error.message, code: 'API_ERROR' };
    throw error;
  }
  revalidateShell();
  return { success: true, message: 'Photo updated.' };
}
