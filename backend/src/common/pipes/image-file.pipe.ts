import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Same limit as the frontend (src/lib/upload.ts).
export const MAX_IMAGE_MB = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/**
 * D65: check every uploaded image in the API, not only in the form.
 * Without it a non-image reached Cloudinary and came back as a 500.
 */
@Injectable()
export class ImageFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Please choose an image file.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `Image is too large (max ${MAX_IMAGE_MB} MB).`,
      );
    }
    return file;
  }
}
