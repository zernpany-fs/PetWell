import { describe, expect, it } from 'vitest';
import { generateShareCode, hashShareCode, shareExpiry } from './share-code';

const SECRET = 'test-secret-that-is-at-least-32-characters';
const NOW = new Date('2026-11-13T10:00:00Z');

describe('generateShareCode (D7, D26)', () => {
  it('returns 6 digits', () => {
    expect(generateShareCode()).toMatch(/^\d{6}$/);
  });

  it('keeps leading zeros', () => {
    expect(generateShareCode(() => 42)).toBe('000042');
  });

  it('asks the random source for 0 to 999999', () => {
    let asked: [number, number] | null = null;
    generateShareCode((min, max) => {
      asked = [min, max];
      return 0;
    });
    expect(asked).toEqual([0, 1_000_000]);
  });
});

describe('hashShareCode (D26)', () => {
  it('gives the same hash for the same code', () => {
    expect(hashShareCode('123456', SECRET)).toBe(
      hashShareCode('123456', SECRET),
    );
  });

  it('gives different hashes for different codes', () => {
    expect(hashShareCode('123456', SECRET)).not.toBe(
      hashShareCode('123457', SECRET),
    );
  });

  it('depends on the secret', () => {
    expect(hashShareCode('123456', SECRET)).not.toBe(
      hashShareCode('123456', SECRET + 'x'),
    );
  });

  it('does not contain the code itself', () => {
    expect(hashShareCode('123456', SECRET)).not.toContain('123456');
  });
});

describe('shareExpiry (D3, D41)', () => {
  it('adds 7 days', () => {
    expect(shareExpiry(7, NOW)).toEqual(new Date('2026-11-20T10:00:00Z'));
  });

  it('adds 90 days', () => {
    expect(shareExpiry(90, NOW)).toEqual(new Date('2027-02-11T10:00:00Z'));
  });

  it('returns null for unlimited', () => {
    expect(shareExpiry(null, NOW)).toBeNull();
  });
});
