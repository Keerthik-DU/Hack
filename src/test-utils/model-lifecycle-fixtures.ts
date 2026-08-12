/**
 * Shared test fixtures for ModelLifecycleManager unit and integration tests.
 *
 * Provides:
 *   - Sample ManifestEntry / ManifestFileEntry objects
 *   - Mock dependency factories (IWebGPUDetector, ICacheManager, IHashVerifier)
 *   - Mock fetch response helpers with ReadableStream simulation
 *   - Typed event capture utilities for asserting emitted event sequences
 *
 * NOTE: These fixtures must NEVER contain real model weights, live CDN URLs,
 *       or user-pasted content.
 */

import { vi } from 'vitest';
import type {
  ManifestEntry,
  ManifestFileEntry,
  HashVerificationResult,
  IWebGPUDetector,
  ICacheManager,
  IHashVerifier,
  ModelLifecycleEvent,
} from '@/types/model-lifecycle';
import type { WebGPUCapability } from '@/types/webgpu';
import type { ModelCacheEntry, CacheStorageError } from '@/types/cache';

// ---------------------------------------------------------------------------
// Manifest fixtures
// ---------------------------------------------------------------------------

/** Model ID used across lifecycle fixtures */
export const FIXTURE_MODEL_ID = 'phi-3.5-mini-4bit';

/** Current model version */
export const FIXTURE_MODEL_VERSION = 'v1.2.0';

/** Older model version used for stale-cache tests */
export const FIXTURE_MODEL_STALE_VERSION = 'v1.1.0';

/** CDN base URL (no trailing slash) */
export const FIXTURE_CDN_BASE_URL = 'https://model-cdn.example.com';

/**
 * SHA-256 hex string used as the "valid" expected hash in fixtures.
 * Not a real hash — tests that need real verification should compute it.
 */
export const FIXTURE_VALID_HASH = 'aabbccdd' + '00112233' + 'aabbccdd' + '00112233' +
  'aabbccdd' + '00112233' + 'aabbccdd' + '00112233';

/** A different hash to simulate a mismatch (corruption / tampering) */
export const FIXTURE_INVALID_HASH = 'deadbeef' + 'cafebabe' + 'deadbeef' + 'cafebabe' +
  'deadbeef' + 'cafebabe' + 'deadbeef' + 'cafebabe';

/** Constructed CDN URL for the primary fixture file */
export const FIXTURE_CDN_URL =
  `${FIXTURE_CDN_BASE_URL}/${FIXTURE_MODEL_ID}/${FIXTURE_MODEL_VERSION}/weights.bin`;

/**
 * Creates a ManifestFileEntry fixture.
 */
export function buildManifestFileEntry(
  overrides: Partial<ManifestFileEntry> = {}
): ManifestFileEntry {
  return {
    filename: 'weights.bin',
    sizeBytes: 2048,
    sha256: FIXTURE_VALID_HASH,
    ...overrides,
  };
}

/**
 * Creates a ManifestEntry fixture for the standard test model.
 */
export function buildManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    id: FIXTURE_MODEL_ID,
    version: FIXTURE_MODEL_VERSION,
    files: [buildManifestFileEntry()],
    ...overrides,
  };
}

/**
 * Creates a minimal manifest array containing the standard test model entry.
 */
export function buildManifestArray(extra: ManifestEntry[] = []): ManifestEntry[] {
  return [buildManifestEntry(), ...extra];
}

// ---------------------------------------------------------------------------
// Weight buffer fixtures
// ---------------------------------------------------------------------------

/**
 * Creates a deterministic ArrayBuffer of `sizeBytes` length, suitable for
 * testing store/verify round-trips. Each byte equals `index % 256`.
 */
export function createFixtureWeightsBuffer(sizeBytes = 2048): ArrayBuffer {
  const buf = new ArrayBuffer(sizeBytes);
  const view = new Uint8Array(buf);
  for (let i = 0; i < sizeBytes; i++) {
    view[i] = i % 256;
  }
  return buf;
}

/**
 * Builds a complete ModelCacheEntry fixture (matching the standard test model).
 */
export function buildModelCacheEntryFixture(
  overrides: Partial<ModelCacheEntry> = {}
): ModelCacheEntry {
  const weights = overrides.weights ?? createFixtureWeightsBuffer();
  return {
    modelId: FIXTURE_MODEL_ID,
    version: FIXTURE_MODEL_VERSION,
    weights,
    sha256Hash: FIXTURE_VALID_HASH,
    storedAt: 1_700_000_000_000,
    sizeBytes: weights.byteLength,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock dependency factories
// ---------------------------------------------------------------------------

/**
 * Creates a mock IWebGPUDetector that resolves as WebGPU-supported.
 */
export function createMockWebGPUDetector(
  supported = true,
  reason?: string
): IWebGPUDetector {
  const capability: WebGPUCapability = supported
    ? { supported: true, adapterInfo: { vendor: 'mock', architecture: 'mock', description: 'Mock GPU' }, detectionTimeMs: 1 }
    : { supported: false, reason: reason ?? 'WebGPU not available', detectionTimeMs: 1 };

  return {
    detect: vi.fn().mockResolvedValue(capability),
  };
}

/**
 * Creates a mock IWebGPUDetector that resolves as WebGPU-unsupported.
 */
export function createMockWebGPUDetectorUnsupported(reason?: string): IWebGPUDetector {
  return createMockWebGPUDetector(false, reason);
}

/**
 * Creates a mock IHashVerifier that always reports valid hashes.
 */
export function createMockHashVerifier(valid = true): IHashVerifier {
  const result: HashVerificationResult = {
    valid,
    computedHash: valid ? FIXTURE_VALID_HASH : FIXTURE_INVALID_HASH,
    expectedHash: FIXTURE_VALID_HASH,
  };
  return {
    verify: vi.fn().mockResolvedValue(result),
  };
}

/**
 * Creates a mock ICacheManager with all methods returning "no entry" by default.
 * Individual methods can be overridden by re-assigning the mock implementation
 * after calling this factory.
 */
export function createMockCacheManager(): ICacheManager {
  return {
    getModel: vi.fn().mockResolvedValue(null),
    storeModel: vi.fn().mockResolvedValue(null), // null = success
    deleteModel: vi.fn().mockResolvedValue(true),
    purgeStaleVersions: vi.fn().mockResolvedValue(0),
  };
}

/**
 * Creates a mock ManifestLoader that resolves to the given entries.
 * Defaults to a single-entry array for the standard fixture model.
 */
export function createMockManifestLoader(
  entries: ManifestEntry[] = buildManifestArray()
): () => Promise<ManifestEntry[]> {
  return vi.fn().mockResolvedValue(entries);
}

// ---------------------------------------------------------------------------
// Mock fetch helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock ReadableStream that delivers `data` as a single chunk.
 * Compatible with jsdom's ReadableStream implementation.
 */
export function createMockReadableStream(data: ArrayBuffer): ReadableStream<Uint8Array> {
  const chunk = new Uint8Array(data);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(chunk);
      controller.close();
    },
  });
}

/**
 * Creates a mock ReadableStream that delivers `data` split across `chunkCount`
 * equal-sized chunks. Useful for testing multi-chunk progress events.
 */
export function createMockReadableStreamChunked(
  data: ArrayBuffer,
  chunkCount = 4
): ReadableStream<Uint8Array> {
  const source = new Uint8Array(data);
  const chunkSize = Math.ceil(source.byteLength / chunkCount);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < source.byteLength; i += chunkSize) {
    chunks.push(source.slice(i, i + chunkSize));
  }

  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index++]);
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Builds a mock `Response` object wrapping a ReadableStream of `data`.
 * `ok` defaults to true (HTTP 200). Set `includeContentLength` to false to
 * test the fallback path that uses manifest sizeBytes for progress calculation.
 */
export function createMockFetchResponse(
  data: ArrayBuffer,
  options: { status?: number; includeContentLength?: boolean; chunkCount?: number } = {}
): Response {
  const { status = 200, includeContentLength = true, chunkCount = 1 } = options;
  const ok = status >= 200 && status < 300;

  const stream =
    chunkCount > 1
      ? createMockReadableStreamChunked(data, chunkCount)
      : createMockReadableStream(data);

  const headers: HeadersInit = {};
  if (includeContentLength) {
    headers['Content-Length'] = String(data.byteLength);
  }

  return new Response(stream, { status, statusText: ok ? 'OK' : 'Error', headers });
}

/**
 * Builds a mock `Response` representing an HTTP error (e.g. 404, 500).
 * The response body is irrelevant — the manager checks `response.ok` first.
 */
export function createMockErrorFetchResponse(status = 500): Response {
  return new Response(null, { status, statusText: 'Internal Server Error' });
}

// ---------------------------------------------------------------------------
// Event capture utility
// ---------------------------------------------------------------------------

/**
 * Creates a typed event listener that records every ModelLifecycleEvent
 * emitted by the manager. Attach the `callback` property as the `onEvent`
 * argument to the ModelLifecycleManager constructor.
 *
 * @example
 * ```ts
 * const capture = createEventCapture();
 * new ModelLifecycleManager(..., capture.callback);
 * await manager.initialize();
 * expect(capture.states()).toEqual(['checking-webgpu', ...]);
 * ```
 */
export function createEventCapture() {
  const events: ModelLifecycleEvent[] = [];

  const callback = (event: ModelLifecycleEvent): void => {
    events.push({ ...event });
  };

  return {
    /** The callback to pass to ModelLifecycleManager constructor. */
    callback,
    /** All captured events in emission order. */
    get events(): readonly ModelLifecycleEvent[] {
      return events;
    },
    /** Convenience: extract the `state` field from every captured event. */
    states(): string[] {
      return events.map((e) => e.state);
    },
    /** Returns the last captured event, or undefined if none were emitted. */
    lastEvent(): ModelLifecycleEvent | undefined {
      return events[events.length - 1];
    },
    /** Returns all progress events (state = 'downloading' with a progress field). */
    progressEvents(): ModelLifecycleEvent[] {
      return events.filter((e) => e.state === 'downloading' && e.progress !== undefined);
    },
    /** Resets the captured events array. */
    reset(): void {
      events.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// CacheStorageError builder
// ---------------------------------------------------------------------------

/**
 * Builds a CacheStorageError fixture for testing cache write failure paths.
 */
export function buildCacheStorageError(message = 'Mock cache write error'): CacheStorageError {
  return {
    kind: 'CacheStorageError',
    code: 'UNKNOWN_ERROR',
    message,
  };
}
