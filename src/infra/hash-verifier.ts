/**
 * HashVerifier — SHA-256 integrity verification using the browser-native Web Crypto API.
 *
 * Implements SRI-style hash verification for LLM model weight ArrayBuffers before they
 * are trusted for inference. Satisfies OWASP A03 (Supply Chain) and A08 (Software/Data
 * Integrity) requirements.
 *
 * Constraints:
 *   - Uses only the browser-native Web Crypto API (crypto.subtle.digest). No external deps.
 *   - Hash comparison is constant-time to prevent timing attacks.
 *   - crypto.subtle unavailability throws a typed HashComputationError.
 */

import { HashComputationError } from '@/types/manifest';
import type { VerificationResult } from '@/types/manifest';

export { HashComputationError };

/**
 * HashVerifier provides static methods for computing and verifying SHA-256 hashes
 * of ArrayBuffer data using the Web Crypto API.
 */
export class HashVerifier {
  /**
   * Computes a SHA-256 hash of the provided ArrayBuffer.
   *
   * @param data - The ArrayBuffer to hash. May be empty (0 bytes).
   * @returns A lowercase hex-encoded SHA-256 hash string (64 characters).
   * @throws {HashComputationError} If crypto.subtle is unavailable (insecure context)
   *   or if the underlying digest operation fails.
   */
  static async computeHash(data: ArrayBuffer): Promise<string> {
    // Guard: crypto.subtle is only available in secure contexts (HTTPS or localhost).
    // An HTTP deployment would land here with an unhelpful TypeError otherwise.
    if (
      typeof globalThis.crypto === 'undefined' ||
      typeof globalThis.crypto.subtle === 'undefined' ||
      globalThis.crypto.subtle === null
    ) {
      throw new HashComputationError(
        'crypto.subtle is unavailable. SHA-256 hashing requires a secure context (HTTPS or localhost). ' +
          'Verify that the application is served over HTTPS.'
      );
    }

    let digestBuffer: ArrayBuffer;
    try {
      digestBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    } catch (cause) {
      throw new HashComputationError(
        `SHA-256 digest operation failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        cause
      );
    }

    return HashVerifier._uint8ArrayToHex(new Uint8Array(digestBuffer));
  }

  /**
   * Verifies the SHA-256 integrity of an ArrayBuffer against an expected hash.
   *
   * Uses constant-time comparison to prevent timing attacks. The expected hash is
   * normalized to lowercase before comparison to tolerate uppercase hex input.
   *
   * @param data - The ArrayBuffer to verify.
   * @param expectedHash - The expected lowercase (or mixed-case) hex-encoded SHA-256 hash.
   * @returns A {@link VerificationResult} with `valid`, `computedHash`, `expectedHash`,
   *   `verificationTimeMs`, and optionally `error` on failure.
   */
  static async verify(data: ArrayBuffer, expectedHash: string): Promise<VerificationResult> {
    const startTime = performance.now();
    const normalizedExpected = expectedHash.toLowerCase();

    let computedHash: string;
    try {
      computedHash = await HashVerifier.computeHash(data);
    } catch (err) {
      const elapsedMs = performance.now() - startTime;
      return {
        valid: false,
        computedHash: '',
        expectedHash: normalizedExpected,
        verificationTimeMs: elapsedMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const valid = HashVerifier._constantTimeEqual(computedHash, normalizedExpected);
    const elapsedMs = performance.now() - startTime;

    return {
      valid,
      computedHash,
      expectedHash: normalizedExpected,
      verificationTimeMs: elapsedMs,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a Uint8Array of bytes to a lowercase hex string.
   *
   * @param bytes - Raw byte array (e.g. output of a SubtleCrypto digest).
   * @returns Lowercase hex-encoded string.
   */
  private static _uint8ArrayToHex(bytes: Uint8Array): string {
    // Pre-allocate array for performance — avoid repeated string concatenation
    const hexChars = new Array<string>(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      hexChars[i] = bytes[i].toString(16).padStart(2, '0');
    }
    return hexChars.join('');
  }

  /**
   * Constant-time comparison of two hex hash strings.
   *
   * Converts both strings to Uint8Arrays of their character codes and compares
   * byte-by-byte, accumulating a difference flag without short-circuiting.
   * This prevents timing side-channels that could leak hash prefix information.
   *
   * Both inputs must already be lowercase hex strings of equal expected length.
   * If lengths differ, returns false after a full scan of the longer string.
   *
   * @param a - First hex string.
   * @param b - Second hex string.
   * @returns `true` if the strings are byte-for-byte identical, `false` otherwise.
   */
  private static _constantTimeEqual(a: string, b: string): boolean {
    // Both should be 64-char hex strings; length mismatch is always false
    const maxLen = Math.max(a.length, b.length);

    // Encode as bytes (character codes) for byte-level comparison
    const aBytes = new Uint8Array(maxLen);
    const bBytes = new Uint8Array(maxLen);

    for (let i = 0; i < a.length; i++) {
      aBytes[i] = a.charCodeAt(i);
    }
    for (let i = 0; i < b.length; i++) {
      bBytes[i] = b.charCodeAt(i);
    }

    // Accumulate XOR differences — never break early
    let diff = a.length === b.length ? 0 : 1;
    for (let i = 0; i < maxLen; i++) {
      diff |= aBytes[i] ^ bBytes[i];
    }

    return diff === 0;
  }
}
