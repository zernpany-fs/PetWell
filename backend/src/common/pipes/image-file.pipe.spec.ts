/**
 * D65: every image upload is checked in the API, not only in the form.
 * Images only, at most 10 MB; anything else is a 400 before Cloudinary.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ImageFilePipe, MAX_IMAGE_BYTES } from './image-file.pipe';

const pipe = new ImageFilePipe();

function file(mimetype: string, size: number): Express.Multer.File {
  return {
    fieldname: 'photo',
    originalname: 'x',
    mimetype,
    size,
    buffer: Buffer.alloc(1),
  } as Express.Multer.File;
}

describe('ImageFilePipe (D65)', () => {
  it('passes an image within the limit through unchanged', () => {
    const f = file('image/jpeg', 1024);
    expect(pipe.transform(f)).toBe(f);
  });

  it('accepts exactly 10 MB', () => {
    const f = file('image/png', MAX_IMAGE_BYTES);
    expect(pipe.transform(f)).toBe(f);
  });

  it.each([
    ['no file', undefined],
    ['a text file', file('text/plain', 10)],
    ['a PDF', file('application/pdf', 10)],
    ['an image over 10 MB', file('image/jpeg', MAX_IMAGE_BYTES + 1)],
  ])('rejects %s with 400', (_label, f) => {
    expect(() => pipe.transform(f as unknown as Express.Multer.File)).toThrow(
      BadRequestException,
    );
  });
});
