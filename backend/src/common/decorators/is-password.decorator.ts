import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, MinLength, ValidateBy } from 'class-validator';

// bcrypt only reads the first 72 bytes of a password.
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 8;

/**
 * D63 password rule for register and reset: any characters,
 * at least 8 characters, at most 72 bytes (UTF-8).
 */
export function IsPassword() {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    }),
    ValidateBy({
      name: 'maxBytes',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES,
        defaultMessage: () =>
          `password must be at most ${PASSWORD_MAX_BYTES} bytes`,
      },
    }),
  );
}
