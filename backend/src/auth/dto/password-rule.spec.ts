/**
 * D63 password rule, checked on the DTOs the ValidationPipe uses:
 * any characters, at least 8, at most 72 bytes (bcrypt's limit).
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';

async function passwordErrors(dto: object): Promise<string[]> {
  const errors = await validate(dto);
  return errors
    .filter((e) => e.property === 'password')
    .flatMap((e) => Object.values(e.constraints ?? {}));
}

const register = (password: string) =>
  plainToInstance(RegisterDto, {
    firstName: 'Test',
    lastName: 'Owner',
    email: 'rule@test.com',
    password,
  });

const reset = (password: string) =>
  plainToInstance(ResetPasswordDto, { token: 'any-token', password });

describe.each([
  ['RegisterDto', register],
  ['ResetPasswordDto', reset],
])('D63 password rule on %s', (_name, build) => {
  it.each([
    ['symbols', 'Zern199*'],
    ['spaces', 'my pet cat'],
    ['8 letters', 'abcdefgh'],
    ['72 ASCII characters (72 bytes)', 'a'.repeat(72)],
    ['24 Thai characters (72 bytes)', 'ก'.repeat(24)],
  ])('accepts %s', async (_label, password) => {
    expect(await passwordErrors(build(password))).toEqual([]);
  });

  it.each([
    ['7 characters', 'Abc123*'],
    ['empty', ''],
    ['73 ASCII characters', 'a'.repeat(73)],
    ['25 Thai characters (75 bytes)', 'ก'.repeat(25)],
  ])('rejects %s', async (_label, password) => {
    expect((await passwordErrors(build(password))).length).toBeGreaterThan(0);
  });
});
