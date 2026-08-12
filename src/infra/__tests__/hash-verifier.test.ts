/**
 * Unit tests for HashVerifier.
 *
 * Coverage:
 *   - computeHash: NIST SHA-256 test vectors (empty, "abc", NIST vector 2)
 *   - computeHash: input/output type correctness
 *   - computeHash: throws HashComputationError when crypto.subtle is unavailable
 *   - verify: matching hash → valid=true
 *   - verify: mismatching hash → valid=false with both hashes populated
 *   - verify: uppercase expected hash → normalized to lowercase
 *   - verify: empty ArrayBuffer → returns valid result
 *   - verify: crypto.subtle unavailable → returns valid=false with error message
 *   - verify: measures elapsed time > 0
 *
 * Web Crypto API is available in Node.js 15+ via globalThis.crypto.subtle,
 * so no mocking is required for normal hash computation.
 */

import { describe, it, expect } from 'vitest';

import { HashVerifier, HashComputationError } from '../hash-verifier';
import {
  SHA256_EMPTY,
  NIST_VECTOR_1_INPUT,
  NIST_VECTOR_1_HASH,
  NIST_VECTOR_2_INPUT,
  NIST_VECTOR_2_HASH,
  stringToArrayBuffer,
} from '@/test-utils/hash-fixtures';

// ---------------------------------------------------------------------------
// computeHash
// ---------------------------------------------------------------------------

describe('HashVerifier.computeHash()', () => {
  it('returns the SHA-256 of an empty ArrayBuffer (NIST FIPS 180-4)', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    const hash = await HashVerifier.computeHash(emptyBuffer);
    expect(hash).toBe(SHA256_EMPTY);
  });

  it('returns a 64-character lowercase hex string', async () => {
    const buffer = stringToArrayBuffer('test');
    const hash = await HashVerifier.computeHash(buffer);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the correct SHA-256 for "abc" (NIST FIPS 180-4 vector 1)', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_1_INPUT);
    const hash = await HashVerifier.computeHash(buffer);
    expect(hash).toBe(NIST_VECTOR_1_HASH);
  });

  it('returns the correct SHA-256 for NIST vector 2 (448-bit message)', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_2_INPUT);
    const hash = await HashVerifier.computeHash(buffer);
    expect(hash).toBe(NIST_VECTOR_2_HASH);
  });

  it('produces different hashes for different inputs', async () => {
    const hash1 = await HashVerifier.computeHash(stringToArrayBuffer('hello'));
    const hash2 = await HashVerifier.computeHash(stringToArrayBuffer('world'));
    expect(hash1).not.toBe(hash2);
  });

  it('produces the same hash for identical inputs (determinism)', async () => {
    const buf = stringToArrayBuffer('deterministic-input');
    const hash1 = await HashVerifier.computeHash(buf);
    const hash2 = await HashVerifier.computeHash(buf);
    expect(hash1).toBe(hash2);
  });

  it('throws HashComputationError when crypto.subtle is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    // Simulate an insecure HTTP context where crypto.subtle is absent
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: undefined },
      configurable: true,
      writable: true,
    });

    try {
      await expect(HashVerifier.computeHash(new ArrayBuffer(4))).rejects.toThrow(
        HashComputationError
      );
      await expect(HashVerifier.computeHash(new ArrayBuffer(4))).rejects.toThrow(
        /crypto\.subtle is unavailable/
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it('throws HashComputationError when crypto is entirely undefined', async () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      await expect(HashVerifier.computeHash(new ArrayBuffer(0))).rejects.toThrow(
        HashComputationError
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

describe('HashVerifier.verify()', () => {
  it('returns valid=true when the computed hash matches the expected hash', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_1_INPUT);
    const result = await HashVerifier.verify(buffer, NIST_VECTOR_1_HASH);

    expect(result.valid).toBe(true);
    expect(result.computedHash).toBe(NIST_VECTOR_1_HASH);
    expect(result.expectedHash).toBe(NIST_VECTOR_1_HASH);
  });

  it('returns valid=false when the computed hash does not match', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_1_INPUT);
    const wrongHash = NIST_VECTOR_2_HASH; // deliberately wrong hash

    const result = await HashVerifier.verify(buffer, wrongHash);

    expect(result.valid).toBe(false);
    expect(result.computedHash).toBe(NIST_VECTOR_1_HASH);
    expect(result.expectedHash).toBe(NIST_VECTOR_2_HASH);
  });

  it('populates both computedHash and expectedHash on mismatch (for debugging)', async () => {
    const buffer = stringToArrayBuffer('some-content');
    const wrongHash = '0'.repeat(64); // all zeros, almost certainly wrong

    const result = await HashVerifier.verify(buffer, wrongHash);

    expect(result.valid).toBe(false);
    expect(result.computedHash).toHaveLength(64);
    expect(result.expectedHash).toHaveLength(64);
    expect(result.computedHash).not.toBe(result.expectedHash);
  });

  it('normalizes uppercase expected hash to lowercase before comparison', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_1_INPUT);
    const upperCaseHash = NIST_VECTOR_1_HASH.toUpperCase();

    const result = await HashVerifier.verify(buffer, upperCaseHash);

    expect(result.valid).toBe(true);
    expect(result.expectedHash).toBe(NIST_VECTOR_1_HASH); // normalized to lowercase
  });

  it('handles an empty ArrayBuffer correctly', async () => {
    const emptyBuffer = new ArrayBuffer(0);
    const result = await HashVerifier.verify(emptyBuffer, SHA256_EMPTY);

    expect(result.valid).toBe(true);
    expect(result.computedHash).toBe(SHA256_EMPTY);
  });

  it('returns verificationTimeMs >= 0', async () => {
    const buffer = stringToArrayBuffer('timing-test');
    const result = await HashVerifier.verify(buffer, NIST_VECTOR_1_HASH);

    expect(result.verificationTimeMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.verificationTimeMs).toBe('number');
  });

  it('returns valid=false with error field when crypto.subtle is unavailable', async () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: undefined },
      configurable: true,
      writable: true,
    });

    try {
      const result = await HashVerifier.verify(new ArrayBuffer(4), NIST_VECTOR_1_HASH);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('crypto.subtle');
      expect(result.computedHash).toBe('');
      expect(result.expectedHash).toBe(NIST_VECTOR_1_HASH);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it('does not return an error field when verification succeeds', async () => {
    const buffer = stringToArrayBuffer(NIST_VECTOR_1_INPUT);
    const result = await HashVerifier.verify(buffer, NIST_VECTOR_1_HASH);

    expect(result.error).toBeUndefined();
  });

  it('returns valid=false for an empty expected hash', async () => {
    const buffer = stringToArrayBuffer('any-content');
    // SHA-256 is never an empty string
    const result = await HashVerifier.verify(buffer, '');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VerificationResult shape
// ---------------------------------------------------------------------------

describe('VerificationResult shape', () => {
  it('always contains all required fields', async () => {
    const buffer = stringToArrayBuffer('shape-test');
    const result = await HashVerifier.verify(buffer, NIST_VECTOR_1_HASH);

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('computedHash');
    expect(result).toHaveProperty('expectedHash');
    expect(result).toHaveProperty('verificationTimeMs');
  });
});
