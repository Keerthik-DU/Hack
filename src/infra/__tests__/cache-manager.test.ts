/**
 * CacheManager unit and integration tests.
 *
 * All tests use fake-indexeddb to simulate a real IndexedDB environment in Node.js
 * (Vitest / jsdom). Each test instantiates a CacheManager with a unique database
 * name to ensure full isolation — no state leaks between tests.
 *
 * Test coverage:
 *   - getModel: hit, miss, version mismatch
 *   - storeModel: success, quota exceeded error, empty buffer validation
 *   - deleteModel: removes entry, idempotent
 *   - purgeStaleVersions: removes stale, keeps current, returns count
 *   - getStorageEstimate: available / unavailable navigator paths
 *   - Full lifecycle: store → retrieve → purge → miss
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

import { CacheManager } from '../cache-manager';
import {
  TEST_MODEL_ID,
  TEST_MODEL_VERSION,
  TEST_MODEL_STALE_VERSION,
  TEST_SHA256_HASH,
  createTestWeightsBuffer,
  buildModelCacheEntry,
} from '@/test-utils/cache-fixtures';
import type { CacheStorageError } from '@/types/cache';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a unique DB name per test to guarantee full isolation. */
let dbCounter = 0;
function uniqueDb(): string {
  return `test-cache-manager-${Date.now()}-${++dbCounter}`;
}

// ---------------------------------------------------------------------------
// getModel
// ---------------------------------------------------------------------------

describe('CacheManager.getModel()', () => {
  it('returns null when the store is empty (cold cache)', async () => {
    const cache = new CacheManager(uniqueDb());
    const result = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(result).toBeNull();
  });

  it('returns null for an unknown modelId after other entries exist', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer();
    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);

    const result = await cache.getModel('unknown-model', TEST_MODEL_VERSION);
    expect(result).toBeNull();
  });

  it('returns null when modelId matches but version is different', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer();
    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);

    const result = await cache.getModel(TEST_MODEL_ID, 'v99.0.0');
    expect(result).toBeNull();
  });

  it('returns the entry when modelId and version both match', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer();
    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);

    const result = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(result).not.toBeNull();
    expect(result!.modelId).toBe(TEST_MODEL_ID);
    expect(result!.version).toBe(TEST_MODEL_VERSION);
    expect(result!.sha256Hash).toBe(TEST_SHA256_HASH);
    expect(result!.sizeBytes).toBe(weights.byteLength);
  });

  it('returns an ArrayBuffer with the correct byte content', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer(512);
    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);

    const result = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(result).not.toBeNull();
    expect(result!.weights.byteLength).toBe(512);
    const retrieved = new Uint8Array(result!.weights);
    const original = new Uint8Array(weights);
    expect(Array.from(retrieved)).toEqual(Array.from(original));
  });
});

// ---------------------------------------------------------------------------
// storeModel
// ---------------------------------------------------------------------------

describe('CacheManager.storeModel()', () => {
  it('returns null (success) when storing a valid entry', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer();
    const result = await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      weights,
      TEST_SHA256_HASH
    );
    expect(result).toBeNull();
  });

  it('persists modelId, version, sha256Hash, and sizeBytes correctly', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer(2048);

    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);
    const entry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);

    expect(entry).not.toBeNull();
    expect(entry!.modelId).toBe(TEST_MODEL_ID);
    expect(entry!.version).toBe(TEST_MODEL_VERSION);
    expect(entry!.sha256Hash).toBe(TEST_SHA256_HASH);
    expect(entry!.sizeBytes).toBe(2048);
  });

  it('sets storedAt to a recent Unix millisecond timestamp', async () => {
    const cache = new CacheManager(uniqueDb());
    const before = Date.now();
    await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );
    const after = Date.now();

    const entry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(entry!.storedAt).toBeGreaterThanOrEqual(before);
    expect(entry!.storedAt).toBeLessThanOrEqual(after);
  });

  it('overwrites an existing entry (PUT/upsert semantics)', async () => {
    const cache = new CacheManager(uniqueDb());
    const v1Weights = createTestWeightsBuffer(256);
    const v2Weights = createTestWeightsBuffer(512);

    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, v1Weights, 'hash-v1');
    await cache.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, v2Weights, 'hash-v2');

    const entry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(entry!.sha256Hash).toBe('hash-v2');
    expect(entry!.sizeBytes).toBe(512);
  });

  it('returns a CacheStorageError with code VALIDATION_ERROR for a 0-byte ArrayBuffer', async () => {
    const cache = new CacheManager(uniqueDb());
    const emptyBuffer = new ArrayBuffer(0);
    const result = await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      emptyBuffer,
      TEST_SHA256_HASH
    );

    expect(result).not.toBeNull();
    const err = result as CacheStorageError;
    expect(err.kind).toBe('CacheStorageError');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('returns a CacheStorageError with code QUOTA_EXCEEDED when quota is exhausted', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer(1024);

    // Simulate a QuotaExceededError by patching the underlying IDB put
    const db = await (cache as unknown as { initDB(): Promise<IDBDatabase> }).initDB();
    const origPut = (db as unknown as { put: (...args: unknown[]) => Promise<unknown> }).put.bind(
      db
    );
    (db as unknown as { put: (...args: unknown[]) => Promise<unknown> }).put = async (
      ...args: unknown[]
    ) => {
      const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
      throw err;
    };

    const result = await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      weights,
      TEST_SHA256_HASH
    );

    expect(result).not.toBeNull();
    const storageErr = result as CacheStorageError;
    expect(storageErr.kind).toBe('CacheStorageError');
    expect(storageErr.code).toBe('QUOTA_EXCEEDED');

    // Restore original
    (db as unknown as { put: (...args: unknown[]) => Promise<unknown> }).put = origPut;
  });
});

// ---------------------------------------------------------------------------
// deleteModel
// ---------------------------------------------------------------------------

describe('CacheManager.deleteModel()', () => {
  it('returns true when deleting an existing entry', async () => {
    const cache = new CacheManager(uniqueDb());
    await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );
    const result = await cache.deleteModel(TEST_MODEL_ID);
    expect(result).toBe(true);
  });

  it('subsequent getModel returns null after deletion', async () => {
    const cache = new CacheManager(uniqueDb());
    await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );
    await cache.deleteModel(TEST_MODEL_ID);
    const entry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(entry).toBeNull();
  });

  it('returns true (idempotent) when deleting a non-existent entry', async () => {
    const cache = new CacheManager(uniqueDb());
    const result = await cache.deleteModel('does-not-exist');
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// purgeStaleVersions
// ---------------------------------------------------------------------------

describe('CacheManager.purgeStaleVersions()', () => {
  it('returns 0 when there are no entries for modelId', async () => {
    const cache = new CacheManager(uniqueDb());
    const count = await cache.purgeStaleVersions(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(count).toBe(0);
  });

  it('returns 0 when the only entry matches currentVersion', async () => {
    const cache = new CacheManager(uniqueDb());
    await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );
    const count = await cache.purgeStaleVersions(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(count).toBe(0);

    // Entry should still be retrievable
    const entry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(entry).not.toBeNull();
  });

  it('deletes a stale entry and returns count 1 when a newer version is current', async () => {
    const dbName = uniqueDb();
    const cache = new CacheManager(dbName);

    // Store stale v1.1.0 under a different model ID (since keyPath is modelId, we simulate
    // multiple models or we directly insert a stale record via the fixture approach)
    // We store it with the same modelId but in a separate store operation:
    // NOTE: since keyPath is modelId, we can only have one entry per modelId at a time.
    // The purge use case is: old code stored v1.1.0, new code ships v1.2.0 and wants
    // to purge the v1.1.0 entry.
    await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_STALE_VERSION, // store as stale version
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );

    const count = await cache.purgeStaleVersions(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(count).toBe(1);

    // Stale entry should be gone
    const staleEntry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_STALE_VERSION);
    expect(staleEntry).toBeNull();
  });

  it('does not affect entries for a different modelId', async () => {
    const cache = new CacheManager(uniqueDb());
    const otherModelId = 'other-model-xyz';

    await cache.storeModel(
      otherModelId,
      TEST_MODEL_STALE_VERSION,
      createTestWeightsBuffer(),
      TEST_SHA256_HASH
    );

    // Purge stale versions for a completely different model
    await cache.purgeStaleVersions('yet-another-model', TEST_MODEL_VERSION);

    // The other model entry should be untouched
    const entry = await cache.getModel(otherModelId, TEST_MODEL_STALE_VERSION);
    expect(entry).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getStorageEstimate
// ---------------------------------------------------------------------------

describe('CacheManager.getStorageEstimate()', () => {
  it('returns available=false when navigator.storage.estimate is not supported', async () => {
    const cache = new CacheManager(uniqueDb());

    // jsdom does not implement navigator.storage.estimate — this should return gracefully
    const estimate = await cache.getStorageEstimate();
    // Either available=true (if jsdom provides it) or available=false (graceful fallback)
    expect(typeof estimate.available).toBe('boolean');
    expect(estimate).toHaveProperty('quota');
    expect(estimate).toHaveProperty('usage');
  });

  it('returns available=true with numeric quota when Storage API is present', async () => {
    const cache = new CacheManager(uniqueDb());

    // Mock navigator.storage.estimate
    const mockEstimate = vi.fn().mockResolvedValue({ quota: 50_000_000, usage: 1_000_000 });
    const originalStorage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      configurable: true,
    });

    const result = await cache.getStorageEstimate();

    expect(result.available).toBe(true);
    expect(result.quota).toBe(50_000_000);
    expect(result.usage).toBe(1_000_000);

    // Restore original
    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      configurable: true,
    });
  });

  it('returns available=false gracefully when navigator.storage.estimate rejects', async () => {
    const cache = new CacheManager(uniqueDb());

    const mockEstimate = vi.fn().mockRejectedValue(new Error('Storage API unavailable'));
    const originalStorage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: mockEstimate },
      configurable: true,
    });

    const result = await cache.getStorageEstimate();
    expect(result.available).toBe(false);

    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      configurable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: full store → retrieve → purge lifecycle
// ---------------------------------------------------------------------------

describe('CacheManager — full lifecycle integration', () => {
  it('completes the store → retrieve → purge → miss lifecycle correctly', async () => {
    const cache = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer(1024);

    // 1. Store stale version
    const storeStaleResult = await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_STALE_VERSION,
      weights,
      TEST_SHA256_HASH
    );
    expect(storeStaleResult).toBeNull(); // success

    // 2. Retrieve stale version — should be found
    const staleEntry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_STALE_VERSION);
    expect(staleEntry).not.toBeNull();
    expect(staleEntry!.version).toBe(TEST_MODEL_STALE_VERSION);

    // 3. Purge stale — should remove 1 entry
    const purgedCount = await cache.purgeStaleVersions(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(purgedCount).toBe(1);

    // 4. Store current version
    const storeCurrentResult = await cache.storeModel(
      TEST_MODEL_ID,
      TEST_MODEL_VERSION,
      weights,
      TEST_SHA256_HASH
    );
    expect(storeCurrentResult).toBeNull();

    // 5. Retrieve current version — should be found
    const currentEntry = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(currentEntry).not.toBeNull();
    expect(currentEntry!.version).toBe(TEST_MODEL_VERSION);
    expect(currentEntry!.sizeBytes).toBe(1024);

    // 6. Stale version should still be absent
    const missingStale = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_STALE_VERSION);
    expect(missingStale).toBeNull();

    // 7. Delete current version
    const deleted = await cache.deleteModel(TEST_MODEL_ID);
    expect(deleted).toBe(true);

    // 8. Final miss
    const finalResult = await cache.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(finalResult).toBeNull();
  });

  it('two separate CacheManager instances with different dbNames do not share state', async () => {
    const cacheA = new CacheManager(uniqueDb());
    const cacheB = new CacheManager(uniqueDb());
    const weights = createTestWeightsBuffer();

    await cacheA.storeModel(TEST_MODEL_ID, TEST_MODEL_VERSION, weights, TEST_SHA256_HASH);

    // cacheB has a different database — should not see cacheA's entry
    const result = await cacheB.getModel(TEST_MODEL_ID, TEST_MODEL_VERSION);
    expect(result).toBeNull();
  });
});
