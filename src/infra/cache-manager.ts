/**
 * CacheManager — IndexedDB persistence layer for LLM model weights.
 *
 * Architecture context:
 *   - Consumed by ModelLifecycleManager to implement the cache-first loading strategy.
 *   - Target: ≤3 second read latency for cached model weights on subsequent visits.
 *   - ZERO user-pasted content is ever stored here. Only open-source model artifacts.
 *
 * Design decisions:
 *   - Wraps the `idb` library (8.x) for ergonomic, Promise-based IndexedDB access.
 *   - Constructor accepts `dbName` for Dependency Injection / test isolation.
 *   - All public methods are async, return typed results or null/error — never throw.
 *   - Quota exceeded errors are caught and returned as CacheStorageError (never crash).
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  ModelCacheEntry,
  CacheStorageError,
  CacheErrorCode,
  StorageEstimate,
} from '@/types/cache';

/** Name of the IndexedDB object store */
const STORE_NAME = 'model-weights' as const;

/** Current database schema version */
const DB_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeCacheStorageError(
  code: CacheErrorCode,
  message: string,
  cause?: unknown
): CacheStorageError {
  return { kind: 'CacheStorageError', code, message, cause };
}

function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

// ---------------------------------------------------------------------------
// CacheManager
// ---------------------------------------------------------------------------

/**
 * Typed CRUD façade over an IndexedDB object store for model-weight caching.
 *
 * @example
 * ```ts
 * const cache = new CacheManager('airgap-scanner-models');
 * await cache.storeModel('phi-3.5-mini', 'v1.2.0', weightsBuffer, sha256Hex);
 * const entry = await cache.getModel('phi-3.5-mini', 'v1.2.0');
 * ```
 */
export class CacheManager {
  private readonly dbName: string;
  private dbPromise: Promise<IDBPDatabase> | null = null;

  /**
   * @param dbName - IndexedDB database name. Defaults to the production database name.
   *                 Pass a unique name per test for isolation.
   */
  constructor(dbName: string = 'airgap-scanner-models') {
    this.dbName = dbName;
  }

  // -------------------------------------------------------------------------
  // Private: lazy database initialisation
  // -------------------------------------------------------------------------

  /**
   * Opens (or returns the cached) IDBPDatabase handle.
   * On first open, upgrades the schema: creates the object store and version index.
   * If the database open fails, attempts to delete and recreate it once.
   */
  private initDB(): Promise<IDBPDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'modelId' });
          store.createIndex('version', 'version', { unique: false });
        }
      },
    }).catch(async (openErr: unknown) => {
      console.warn('[CacheManager] initDB: initial open failed, attempting recovery', {
        dbName: this.dbName,
        error: openErr instanceof Error ? openErr.message : String(openErr),
      });

      // Reset cached promise so future calls retry through this path
      this.dbPromise = null;

      // Attempt to delete the corrupt database and recreate it
      try {
        await new Promise<void>((resolve, reject) => {
          const req = indexedDB.deleteDatabase(this.dbName);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch (deleteErr) {
        console.warn('[CacheManager] initDB: database deletion also failed', {
          dbName: this.dbName,
          error: deleteErr instanceof Error ? deleteErr.message : String(deleteErr),
        });
      }

      // Re-attempt open after deletion
      const recovered = await openDB(this.dbName, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'modelId' });
            store.createIndex('version', 'version', { unique: false });
          }
        },
      });

      // Cache the recovered handle
      this.dbPromise = Promise.resolve(recovered);
      return recovered;
    });

    return this.dbPromise;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Retrieves a cached model entry by `modelId`, validating that the stored
   * version matches `version`. Returns `null` on cache miss or version mismatch.
   *
   * @param modelId  - Unique model identifier.
   * @param version  - Expected version string (e.g. 'v1.2.0').
   * @returns The full `ModelCacheEntry` when a matching entry is found, otherwise `null`.
   */
  async getModel(modelId: string, version: string): Promise<ModelCacheEntry | null> {
    try {
      const db = await this.initDB();
      const entry = (await db.get(STORE_NAME, modelId)) as ModelCacheEntry | undefined;

      if (!entry) {
        return null;
      }

      // Version mismatch: treat as cache miss
      if (entry.version !== version) {
        return null;
      }

      return entry;
    } catch (err) {
      console.warn('[CacheManager] getModel failed', {
        modelId,
        version,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Persists model weights and metadata to IndexedDB.
   *
   * Performs a PUT (upsert) — overwrites any existing entry for `modelId`.
   * Returns `null` on success, or a `CacheStorageError` on failure.
   *
   * @param modelId   - Unique model identifier.
   * @param version   - Version string (e.g. 'v1.2.0').
   * @param weights   - Raw model weight bytes. Must be non-empty.
   * @param sha256Hash - Hex-encoded SHA-256 of `weights`.
   */
  async storeModel(
    modelId: string,
    version: string,
    weights: ArrayBuffer,
    sha256Hash: string
  ): Promise<null | CacheStorageError> {
    // Validate that we received actual bytes (0-byte buffer is an error)
    if (weights.byteLength === 0) {
      const err = makeCacheStorageError(
        'VALIDATION_ERROR',
        'storeModel: weights ArrayBuffer must not be empty'
      );
      console.warn('[CacheManager] storeModel validation error', { modelId, version });
      return err;
    }

    try {
      const db = await this.initDB();

      const entry: ModelCacheEntry = {
        modelId,
        version,
        weights,
        sha256Hash,
        storedAt: Date.now(),
        sizeBytes: weights.byteLength,
      };

      await db.put(STORE_NAME, entry);
      return null;
    } catch (err) {
      if (isQuotaExceededError(err)) {
        const storageErr = makeCacheStorageError(
          'QUOTA_EXCEEDED',
          `storeModel: IndexedDB storage quota exceeded while storing model '${modelId}' (${weights.byteLength} bytes). ` +
            'This is common in Safari private browsing mode (~50MB limit).',
          err
        );
        console.warn('[CacheManager] storeModel quota exceeded', {
          modelId,
          version,
          sizeBytes: weights.byteLength,
        });
        return storageErr;
      }

      const storageErr = makeCacheStorageError(
        'UNKNOWN_ERROR',
        `storeModel: unexpected error storing model '${modelId}': ${err instanceof Error ? err.message : String(err)}`,
        err
      );
      console.warn('[CacheManager] storeModel unexpected error', {
        modelId,
        version,
        error: err instanceof Error ? err.message : String(err),
      });
      return storageErr;
    }
  }

  /**
   * Removes the entry for `modelId` from the store.
   *
   * @param modelId - Unique model identifier.
   * @returns `true` when deletion succeeded (including when no entry existed), `false` on error.
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const db = await this.initDB();
      await db.delete(STORE_NAME, modelId);
      return true;
    } catch (err) {
      console.warn('[CacheManager] deleteModel failed', {
        modelId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Deletes all entries for `modelId` whose version does NOT match `currentVersion`.
   *
   * This implements the automatic stale-cache invalidation behaviour required
   * when the application ships a new model version.
   *
   * @param modelId        - Unique model identifier.
   * @param currentVersion - The current (valid) version to keep.
   * @returns The number of entries that were purged.
   */
  async purgeStaleVersions(modelId: string, currentVersion: string): Promise<number> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      let purgedCount = 0;

      // Iterate all records and delete stale versions matching this modelId
      let cursor = await store.openCursor();
      while (cursor) {
        const entry = cursor.value as ModelCacheEntry;
        if (entry.modelId === modelId && entry.version !== currentVersion) {
          await cursor.delete();
          purgedCount++;
        }
        cursor = await cursor.continue();
      }

      await tx.done;
      return purgedCount;
    } catch (err) {
      console.warn('[CacheManager] purgeStaleVersions failed', {
        modelId,
        currentVersion,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

  /**
   * Queries the Storage Estimation API to report available and used quota.
   *
   * @returns A `StorageEstimate` object. When the API is not available (e.g. non-secure
   *          context or older browser), `available` is `false` and quota/usage are `undefined`.
   */
  async getStorageEstimate(): Promise<StorageEstimate> {
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
        return { available: false, quota: undefined, usage: undefined };
      }

      const estimate = await navigator.storage.estimate();
      return {
        available: true,
        quota: estimate.quota,
        usage: estimate.usage,
      };
    } catch (err) {
      console.warn('[CacheManager] getStorageEstimate failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return { available: false, quota: undefined, usage: undefined };
    }
  }
}
