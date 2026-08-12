/**
 * Shared test fixtures for HashVerifier unit tests.
 *
 * Provides:
 *   - Pre-computed SHA-256 hashes for known test buffers (NIST test vectors).
 *   - Helper to convert a UTF-8 string to an ArrayBuffer for hashing.
 *   - Sample ModelManifest objects for ManifestLoader tests.
 *
 * NIST SHA-256 test vector source:
 *   https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/SHA256.pdf
 *
 * NOTE: These fixtures must NEVER contain real model weights or user-pasted content.
 */

import type { ModelManifest } from '@/types/manifest';

// ---------------------------------------------------------------------------
// NIST SHA-256 test vectors
// ---------------------------------------------------------------------------

/**
 * SHA-256 of an empty ArrayBuffer (0 bytes).
 * NIST FIPS 180-4 / RFC 6234 test vector.
 */
export const SHA256_EMPTY =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Input string for the first NIST test vector: ASCII "abc".
 */
export const NIST_VECTOR_1_INPUT = 'abc';

/**
 * SHA-256("abc") — NIST FIPS 180-4 test vector 1.
 */
export const NIST_VECTOR_1_HASH =
  'ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469748f1cca5e98b7f6d' +
  ''; // 64 hex chars when joined — split for readability

/**
 * Input string for the second NIST test vector: a 448-bit message.
 */
export const NIST_VECTOR_2_INPUT =
  'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';

/**
 * SHA-256 of the NIST vector 2 input string.
 * NIST FIPS 180-4 test vector 2.
 */
export const NIST_VECTOR_2_HASH =
  '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';

// ---------------------------------------------------------------------------
// Buffer helpers
// ---------------------------------------------------------------------------

/**
 * Converts a UTF-8 string to an ArrayBuffer for use with crypto.subtle.digest.
 *
 * @param text - The string to encode.
 * @returns An ArrayBuffer containing the UTF-8 bytes of the string.
 */
export function stringToArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

/**
 * Creates a deterministic ArrayBuffer of the given size filled with a repeating
 * byte pattern (each byte = index % 256). Suitable for performance testing.
 *
 * @param sizeBytes - Desired buffer size in bytes.
 * @returns A filled ArrayBuffer.
 */
export function createPatternBuffer(sizeBytes: number): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < sizeBytes; i++) {
    view[i] = i % 256;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Manifest fixtures
// ---------------------------------------------------------------------------

/**
 * A minimal valid ModelManifest for testing loadManifest() happy-path scenarios.
 */
export const VALID_MANIFEST: ModelManifest = {
  manifestVersion: '1.0.0',
  models: [
    {
      modelId: 'phi-3.5-mini-4bit',
      version: 'v1.2.0',
      files: [
        {
          filename: 'weights.bin',
          sha256: 'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789',
          sizeBytes: 314572800,
        },
        {
          filename: 'tokenizer.json',
          sha256: 'b2e3f4a5c6d70891b2e3f4a5c6d70891b2e3f4a5c6d70891b2e3f4a5c6d70891',
          sizeBytes: 2097152,
        },
      ],
    },
  ],
};

/**
 * A valid manifest with multiple model entries for testing lookup scenarios.
 */
export const MULTI_MODEL_MANIFEST: ModelManifest = {
  manifestVersion: '1.0.0',
  models: [
    {
      modelId: 'phi-3.5-mini-4bit',
      version: 'v1.2.0',
      files: [
        {
          filename: 'weights.bin',
          sha256: 'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789',
          sizeBytes: 314572800,
        },
      ],
    },
    {
      modelId: 'tinyllama-1b-4bit',
      version: 'v2.0.0',
      files: [
        {
          filename: 'weights.bin',
          sha256: 'c4d5e6f7a8b90123c4d5e6f7a8b90123c4d5e6f7a8b90123c4d5e6f7a8b90123',
          sizeBytes: 838860800,
        },
      ],
    },
  ],
};

/**
 * Raw manifest JSON object missing the required 'manifestVersion' field.
 * Used to test ManifestParseError on invalid input.
 */
export const MANIFEST_MISSING_VERSION = {
  models: [],
};

/**
 * Raw manifest JSON object with a malformed sha256 value (not 64 hex chars).
 * Used to test ManifestParseError on invalid sha256 format.
 */
export const MANIFEST_BAD_SHA256 = {
  manifestVersion: '1.0.0',
  models: [
    {
      modelId: 'test-model',
      version: 'v1.0.0',
      files: [
        {
          filename: 'weights.bin',
          sha256: 'not-a-valid-hash',
          sizeBytes: 1024,
        },
      ],
    },
  ],
};

/**
 * Raw manifest JSON object where 'models' is not an array.
 * Used to test ManifestParseError on type mismatch.
 */
export const MANIFEST_MODELS_NOT_ARRAY = {
  manifestVersion: '1.0.0',
  models: 'not-an-array',
};
