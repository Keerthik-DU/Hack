/**
 * Type definitions for the IndexedDB model-weight cache.
 * Covers cache entries, error shapes, and storage quota reporting.
 */

/**
 * A single entry stored in the 'model-weights' IndexedDB object store.
 * The `weights` ArrayBuffer contains the raw quantized model binary.
 * User-pasted content is NEVER stored here — only open-source model artifacts.
 */
export interface ModelCacheEntry {
  /** Unique model identifier (e.g. 'phi-3.5-mini-4bit') */
  readonly modelId: string;
  /** Semantic version string matching the pinned model manifest (e.g. 'v1.2.0') */
  readonly version: string;
  /** Raw quantized model weights binary */
  readonly weights: ArrayBuffer;
  /** Hex-encoded SHA-256 hash of `weights` for integrity verification */
  readonly sha256Hash: string;
  /** Unix millisecond timestamp at storage time (Date.now()) */
  readonly storedAt: number;
  /** Byte length of the `weights` ArrayBuffer */
  readonly sizeBytes: number;
}

/**
 * Specific error codes produced by CacheManager operations.
 *
 * - `QUOTA_EXCEEDED`     : IndexedDB storage quota exhausted (e.g. Safari private browsing).
 * - `DB_OPEN_FAILED`     : Could not open or upgrade the IndexedDB database.
 * - `VALIDATION_ERROR`   : Caller supplied invalid arguments (e.g. empty ArrayBuffer).
 * - `UNKNOWN_ERROR`      : Unexpected error that does not match a known category.
 */
export type CacheErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'DB_OPEN_FAILED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Typed error object returned (never thrown) by CacheManager write operations.
 */
export interface CacheStorageError {
  /** Discriminant field for safe narrowing in callers */
  readonly kind: 'CacheStorageError';
  /** Machine-readable error code */
  readonly code: CacheErrorCode;
  /** Human-readable explanation, suitable for console.warn */
  readonly message: string;
  /** Original native error for debugging, if available */
  readonly cause?: unknown;
}

/**
 * Quota and usage figures from the Storage API, or null when the API is unavailable.
 */
export interface StorageEstimate {
  /** Total quota in bytes, if reported by the browser */
  readonly quota: number | undefined;
  /** Bytes already used, if reported by the browser */
  readonly usage: number | undefined;
  /** Whether the Storage Estimation API was available */
  readonly available: boolean;
}
