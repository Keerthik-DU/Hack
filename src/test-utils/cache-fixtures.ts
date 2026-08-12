/**
 * Shared test fixtures for CacheManager unit and integration tests.
 *
 * Provides:
 *   - A 1 KB ArrayBuffer simulating small model weights (sufficient for store/retrieve tests).
 *   - Sample model metadata matching the ModelCacheEntry schema.
 *   - Helper to create fresh ArrayBuffers of arbitrary sizes for quota testing.
 *
 * NOTE: These fixtures must NEVER contain real model weights or user-pasted content.
 */

import type { ModelCacheEntry } from '@/types/cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Size of the default test weight buffer (1 KB) */
export const TEST_WEIGHTS_SIZE_BYTES = 1024;

/** Model ID used across fixture helpers */
export const TEST_MODEL_ID = 'phi-3.5-mini-4bit-test';

/** Current version used in fixtures */
export const TEST_MODEL_VERSION = 'v1.2.0';

/** An older version used to exercise stale-purge logic */
export const TEST_MODEL_STALE_VERSION = 'v1.1.0';

/**
 * Fake SHA-256 hex string (64 hex chars).
 * Real hash validation is handled by SRIVerifier — these tests only verify
 * that the hash is stored and retrieved without modification.
 */
export const TEST_SHA256_HASH =
  'a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789a3f1d2c4b5e60789';

// ---------------------------------------------------------------------------
// Buffer helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh 1 KB ArrayBuffer filled with deterministic non-zero bytes
 * (each byte equals `index % 256`). Suitable for verifying round-trip integrity.
 */
export function createTestWeightsBuffer(sizeBytes: number = TEST_WEIGHTS_SIZE_BYTES): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < sizeBytes; i++) {
    view[i] = i % 256;
  }
  return buffer;
}

/**
 * Creates a large ArrayBuffer intended to trigger quota exceeded errors in
 * environments with very limited storage (e.g. fake-indexeddb simulations).
 * Size is configurable — default is 100 MB.
 */
export function createLargeWeightsBuffer(sizeMb: number = 100): ArrayBuffer {
  return new ArrayBuffer(sizeMb * 1024 * 1024);
}

// ---------------------------------------------------------------------------
// Entry builders
// ---------------------------------------------------------------------------

/**
 * Builds a complete `ModelCacheEntry` fixture using the standard test constants.
 * Override any field by passing a partial object.
 */
export function buildModelCacheEntry(overrides: Partial<ModelCacheEntry> = {}): ModelCacheEntry {
  const weights = overrides.weights ?? createTestWeightsBuffer();
  return {
    modelId: TEST_MODEL_ID,
    version: TEST_MODEL_VERSION,
    weights,
    sha256Hash: TEST_SHA256_HASH,
    storedAt: 1_700_000_000_000, // fixed timestamp for deterministic assertions
    sizeBytes: weights.byteLength,
    ...overrides,
  };
}

/**
 * Builds a stale-version `ModelCacheEntry` (version = TEST_MODEL_STALE_VERSION).
 * Used to populate the store before running purgeStaleVersions tests.
 */
export function buildStaleModelCacheEntry(
  overrides: Partial<ModelCacheEntry> = {}
): ModelCacheEntry {
  return buildModelCacheEntry({
    version: TEST_MODEL_STALE_VERSION,
    ...overrides,
  });
}
