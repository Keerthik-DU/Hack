/**
 * Type definitions for the ModelLifecycleManager.
 *
 * These types define the state machine transitions, progress events,
 * configuration, and dependency interfaces for the full model lifecycle
 * pipeline: WebGPU check → cache lookup → hash verify → download → store.
 *
 * Architecture context:
 *   - Consumed by ModelLifecycleManager (src/infra/model-lifecycle-manager.ts)
 *   - Events are forwarded to the useModelStatus hook and ModelProgressBar UI component.
 *   - All dependency interfaces follow the DI pattern required by organisational policy.
 */

import type { WebGPUCapability } from '@/types/webgpu';
import type { ModelCacheEntry, CacheStorageError } from '@/types/cache';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * All possible states in the model loading state machine.
 *
 * Terminal states: 'ready' | 'degraded' | 'error'
 * Non-terminal states: all others.
 *
 * State transitions (happy path):
 *   idle → checking-webgpu → checking-cache → verifying-cache → ready
 *   idle → checking-webgpu → checking-cache → downloading → verifying-download → caching → ready
 */
export type ModelLifecycleState =
  | 'idle'
  | 'checking-webgpu'
  | 'checking-cache'
  | 'verifying-cache'
  | 'downloading'
  | 'verifying-download'
  | 'caching'
  | 'ready'
  | 'degraded'
  | 'error';

// ---------------------------------------------------------------------------
// Progress and events
// ---------------------------------------------------------------------------

/**
 * Real-time progress information for an in-flight model weight download.
 * Emitted as part of ModelLifecycleEvent while state = 'downloading'.
 */
export interface DownloadProgress {
  /** Bytes received from the CDN so far */
  readonly bytesLoaded: number;
  /**
   * Total content length in bytes, sourced from Content-Length header or manifest.
   * May be -1 when unknown (e.g. chunked transfer encoding without Content-Length).
   */
  readonly totalBytes: number;
  /**
   * Estimated download completion as an integer percentage (0–100).
   * Reported as 0 when totalBytes is ≤ 0 (indeterminate).
   */
  readonly percent: number;
}

/**
 * Typed event emitted by ModelLifecycleManager at each state transition.
 *
 * Consumers:
 *   - useModelStatus hook — reads state and maps to EngineStatus
 *   - ModelProgressBar component — reads progress for UI display
 */
export interface ModelLifecycleEvent {
  /** Current lifecycle state */
  readonly state: ModelLifecycleState;
  /**
   * Present only while state = 'downloading'.
   * Updated on each chunk arrival from the ReadableStream.
   */
  readonly progress?: DownloadProgress;
  /**
   * Human-readable reason string.
   * Present when state = 'degraded' (e.g. "Download failed after 3 retries") or 'error'.
   */
  readonly error?: string;
  /** Resolved model identifier, available once the manifest has been loaded. */
  readonly modelId?: string;
  /** Resolved model version string, available once the manifest has been loaded. */
  readonly version?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Construction-time configuration for ModelLifecycleManager.
 */
export interface ModelLifecycleConfig {
  /** Unique model identifier matching the manifest entry (e.g. 'phi-3.5-mini-4bit') */
  readonly modelId: string;
  /**
   * Base URL for the model CDN, WITHOUT trailing slash.
   * e.g. 'https://model-cdn.example.com'
   */
  readonly cdnBaseUrl: string;
  /**
   * Maximum number of total download attempts before degrading to regex+entropy mode.
   * Defaults to 3.
   */
  readonly maxRetries?: number;
  /**
   * Millisecond delays inserted BEFORE each retry attempt (not before the first attempt).
   * retryDelays[0] is the delay before attempt 1, retryDelays[1] before attempt 2, etc.
   * Defaults to [1000, 2000, 4000] (exponential backoff).
   */
  readonly retryDelays?: readonly number[];
}

// ---------------------------------------------------------------------------
// Manifest types
// ---------------------------------------------------------------------------

/**
 * A single binary file entry within a model manifest record.
 */
export interface ManifestFileEntry {
  /** Filename within the CDN model directory (e.g. 'weights.bin') */
  readonly filename: string;
  /** Expected file size in bytes — used as fallback when Content-Length is absent */
  readonly sizeBytes: number;
  /** Hex-encoded SHA-256 hash for SRI-style integrity verification */
  readonly sha256: string;
  /** Optional human-readable note (e.g. placeholder warning) */
  readonly note?: string;
}

/**
 * A single model entry in the pinned model manifest.
 * Loaded at runtime via the ManifestLoader function.
 */
export interface ManifestEntry {
  /** Unique model identifier matching ModelLifecycleConfig.modelId */
  readonly id: string;
  /** Semantic version string (e.g. 'v1.2.0' or '1.0.0-placeholder') */
  readonly version: string;
  /** Ordered list of binary files that compose this model */
  readonly files: readonly ManifestFileEntry[];
}

// ---------------------------------------------------------------------------
// Verification types
// ---------------------------------------------------------------------------

/**
 * Result of a hash verification operation performed by IHashVerifier.
 */
export interface HashVerificationResult {
  /** Whether the computed hash matches the expected hash */
  readonly valid: boolean;
  /** Hex-encoded SHA-256 of the input data, computed by the verifier */
  readonly computedHash: string;
  /** The expected hash supplied for comparison */
  readonly expectedHash: string;
}

// ---------------------------------------------------------------------------
// Dependency interfaces (DI contract)
// ---------------------------------------------------------------------------

/**
 * Interface for the WebGPU capability detector dependency.
 * Satisfied by WebGPUDetector (static detect method wrapped in an object literal)
 * or any test mock.
 */
export interface IWebGPUDetector {
  detect(): Promise<WebGPUCapability>;
}

/**
 * Interface for the hash verification dependency (SRIVerifier / HashVerifier).
 * Computes the SHA-256 of `data` and compares it against `expectedHash`.
 */
export interface IHashVerifier {
  verify(data: ArrayBuffer, expectedHash: string): Promise<HashVerificationResult>;
}

/**
 * Interface for the CacheManager dependency, expressed as the minimal set of
 * methods consumed by ModelLifecycleManager. Concrete implementation:
 * src/infra/cache-manager.ts — CacheManager class.
 */
export interface ICacheManager {
  getModel(modelId: string, version: string): Promise<ModelCacheEntry | null>;
  storeModel(
    modelId: string,
    version: string,
    weights: ArrayBuffer,
    sha256Hash: string
  ): Promise<null | CacheStorageError>;
  deleteModel(modelId: string): Promise<boolean>;
  purgeStaleVersions(modelId: string, currentVersion: string): Promise<number>;
}

/**
 * Async function that loads and returns the array of manifest entries.
 * Injected via DI — allows unit tests to supply stub manifests.
 *
 * @throws When the manifest cannot be fetched or parsed.
 */
export type ManifestLoader = () => Promise<ManifestEntry[]>;

/**
 * Callback registered with ModelLifecycleManager to receive typed lifecycle events.
 * Called synchronously in the same microtask as the state transition.
 */
export type ModelLifecycleEventCallback = (event: ModelLifecycleEvent) => void;
