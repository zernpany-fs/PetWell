// D63 password rule in the forms: any characters, at least 8, at most 72 bytes.
import { describe, expect, it } from 'vitest';
import { registerSchema, resetPasswordSchema } from '../auth.schema';

const register = (password: string) =>
  registerSchema.safeParse({
    firstName: 'Test',
    lastName: 'Owner',
    email: 'rule@test.com',
    password,
  }).success;

const reset = (password: string) =>
  resetPasswordSchema.safeParse({ password, confirmPassword: password })
    .success;

describe.each([
  ['register', register],
  ['reset password', reset],
])('D63 password rule (%s)', (_name, check) => {
  it.each([
    ['symbols', 'Zern199*'],
    ['spaces', 'my pet cat'],
    ['72 ASCII characters (72 bytes)', 'a'.repeat(72)],
    ['24 Thai characters (72 bytes)', 'ก'.repeat(24)],
  ])('accepts %s', (_label, password) => {
    expect(check(password)).toBe(true);
  });

  it.each([
    ['7 characters', 'Abc123*'],
    ['73 ASCII characters', 'a'.repeat(73)],
    ['25 Thai characters (75 bytes)', 'ก'.repeat(25)],
  ])('rejects %s', (_label, password) => {
    expect(check(password)).toBe(false);
  });
});
