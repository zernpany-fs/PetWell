export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const UPLOAD_TOO_LARGE_MESSAGE = `Image is too large (max ${MAX_UPLOAD_MB} MB). Please choose a smaller file.`;
export const UPLOAD_NOT_IMAGE_MESSAGE = 'Please choose an image file.';

export function validateImageUpload(file: File): string | null {
  if (!file.type.startsWith('image/')) return UPLOAD_NOT_IMAGE_MESSAGE;
  if (file.size > MAX_UPLOAD_BYTES) return UPLOAD_TOO_LARGE_MESSAGE;
  return null;
}
