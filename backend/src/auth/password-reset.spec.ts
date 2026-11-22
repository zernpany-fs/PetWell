import { describe, expect, it } from 'vitest';
import {
  generateResetToken,
  hashResetToken,
  resetLink,
} from './password-reset';

describe('password reset token (D56)', () => {
  it('is 32 random bytes, URL-safe, and different every time', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes in base64url
    expect(a).not.toBe(b);
  });

  it('is stored as a SHA-256 hash, never as the token itself', () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashResetToken(token)).toBe(hash); // same token, same hash
  });

  it('builds the link from FRONTEND_URL, with or without a trailing slash', () => {
    expect(resetLink('https://petwell.example/', 'abc')).toBe(
      'https://petwell.example/reset-password?token=abc',
    );
    expect(resetLink('http://localhost:3000', 'abc')).toBe(
      'http://localhost:3000/reset-password?token=abc',
    );
  });
});
