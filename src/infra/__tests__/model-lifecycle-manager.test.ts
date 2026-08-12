/**
 * ModelLifecycleManager unit and integration tests.
 *
 * All external dependencies are mocked via Vitest spy factories.
 * fetch() is stubbed globally for each test that exercises the download path.
 *
 * Test scenarios covered:
 *   1. Happy path – cache hit: WebGPU available → cache hit → hash valid → READY
 *   2. Happy path – cache miss: WebGPU available → cache miss → download → hash valid → cached → READY
 *   3. Cache corruption: cache hit → hash invalid → purge → download → verify → cache → READY
 *   4. Version mismatch (cache miss): getModel returns null → purge stale → download → READY
 *   5. Download failure with retry: first 2 attempts fail, third succeeds → READY
 *   6. Download failure exhausted: all 3 attempts fail → DEGRADED
 *   7. WebGPU unavailable: detect() returns supported=false → immediate DEGRADED
 *   8. Download abort via AbortController: abort() called → clean cancellation → ERROR
 *
 * Integration test:
 *   9. Full happy-path lifecycle (detect → miss → download → verify → cache → ready)
 *      with a mocked fetch returning a ReadableStream, asserting the full event sequence.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

import { ModelLifecycleManager } from '../model-lifecycle-manager';
import {
  FIXTURE_MODEL_ID,
  FIXTURE_MODEL_VERSION,
  FIXTURE_CDN_BASE_URL,
  FIXTURE_VALID_HASH,
  buildModelCacheEntryFixture,
  createFixtureWeightsBuffer,
  createMockWebGPUDetector,
  createMockWebGPUDetectorUnsupported,
  createMockHashVerifier,
  createMockCacheManager,
  createMockManifestLoader,
  createMockFetchResponse,
  createEventCapture,
  buildCacheStorageError,
} from '@/test-utils/model-lifecycle-fixtures';
import type {
  ModelLifecycleConfig,
  IWebGPUDetector,
  ICacheManager,
  IHashVerifier,
  ManifestLoader,
} from '@/types/model-lifecycle';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Standard configuration shared across most tests. */
const BASE_CONFIG: ModelLifecycleConfig = {
  modelId: FIXTURE_MODEL_ID,
  cdnBaseUrl: FIXTURE_CDN_BASE_URL,
  // Use 0-ms delays so tests don't wait for real backoff timers
  maxRetries: 3,
  retryDelays: [0, 0, 0],
};

/** Builds a ModelLifecycleManager with all mocked dependencies. */
function buildManager(
  overrides: {
    webgpu?: IWebGPUDetector;
    cache?: ICacheManager;
    hashVerifier?: IHashVerifier;
    manifest?: ManifestLoader;
    config?: Partial<ModelLifecycleConfig>;
    onEvent?: ReturnType<typeof createEventCapture>['callback'];
  } = {}
) {
  const capture = createEventCapture();
  const manager = new ModelLifecycleManager(
    overrides.webgpu ?? createMockWebGPUDetector(),
    overrides.cache ?? createMockCacheManager(),
    overrides.hashVerifier ?? createMockHashVerifier(),
    overrides.manifest ?? createMockManifestLoader(),
    { ...BASE_CONFIG, ...overrides.config },
    overrides.onEvent ?? capture.callback
  );
  return { manager, capture };
}

// ---------------------------------------------------------------------------
// Scenario 1: Happy path — cache hit
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 1: Cache hit (WebGPU available, valid cached model)', () => {
  it('emits the correct state sequence and resolves without downloading', async () => {
    const cache = createMockCacheManager();
    const weights = createFixtureWeightsBuffer();
    const cachedEntry = buildModelCacheEntryFixture({ weights });
    vi.mocked(cache.getModel).mockResolvedValue(cachedEntry);

    const hashVerifier = createMockHashVerifier(true);
    const { manager, capture } = buildManager({ cache, hashVerifier });

    await manager.initialize();

    expect(capture.states()).toEqual([
      'checking-webgpu',
      'checking-cache',
      'verifying-cache',
      'ready',
    ]);
    expect(capture.lastEvent()?.modelId).toBe(FIXTURE_MODEL_ID);
    expect(capture.lastEvent()?.version).toBe(FIXTURE_MODEL_VERSION);
  });

  it('does NOT call fetch for the download path on a cache hit', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const cache = createMockCacheManager();
    vi.mocked(cache.getModel).mockResolvedValue(buildModelCacheEntryFixture());

    const { manager } = buildManager({ cache, hashVerifier: createMockHashVerifier(true) });
    await manager.initialize();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('passes the cached weights to the hash verifier', async () => {
    const weights = createFixtureWeightsBuffer(512);
    const cache = createMockCacheManager();
    vi.mocked(cache.getModel).mockResolvedValue(buildModelCacheEntryFixture({ weights }));

    const hashVerifier = createMockHashVerifier(true);
    const { manager } = buildManager({ cache, hashVerifier });

    await manager.initialize();

    expect(vi.mocked(hashVerifier.verify)).toHaveBeenCalledWith(weights, FIXTURE_VALID_HASH);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Happy path — cache miss, download succeeds
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 2: Cache miss (download, verify, cache)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits the correct full state sequence', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const { manager, capture } = buildManager();
    await manager.initialize();

    const states = capture.states();
    expect(states[0]).toBe('checking-webgpu');
    expect(states[1]).toBe('checking-cache');
    expect(states).toContain('downloading');
    expect(states).toContain('verifying-download');
    expect(states).toContain('caching');
    expect(states[states.length - 1]).toBe('ready');

    vi.unstubAllGlobals();
  });

  it('calls purgeStaleVersions before download on cache miss', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const cache = createMockCacheManager();
    // getModel returns null → cache miss
    vi.mocked(cache.getModel).mockResolvedValue(null);

    const { manager } = buildManager({ cache });
    await manager.initialize();

    expect(vi.mocked(cache.purgeStaleVersions)).toHaveBeenCalledWith(
      FIXTURE_MODEL_ID,
      FIXTURE_MODEL_VERSION
    );

    vi.unstubAllGlobals();
  });

  it('calls storeModel with the downloaded weights and correct metadata', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const cache = createMockCacheManager();
    const { manager } = buildManager({ cache });
    await manager.initialize();

    expect(vi.mocked(cache.storeModel)).toHaveBeenCalledWith(
      FIXTURE_MODEL_ID,
      FIXTURE_MODEL_VERSION,
      expect.any(ArrayBuffer),
      FIXTURE_VALID_HASH
    );

    vi.unstubAllGlobals();
  });

  it('emits DOWNLOAD_PROGRESS events during download', async () => {
    const weights = createFixtureWeightsBuffer(1024);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createMockFetchResponse(weights, { chunkCount: 4 }))
    );

    const { manager, capture } = buildManager();
    await manager.initialize();

    const progressEvents = capture.progressEvents();
    expect(progressEvents.length).toBeGreaterThan(0);
    // Every progress event should have valid bytesLoaded
    for (const evt of progressEvents) {
      expect(evt.progress?.bytesLoaded).toBeGreaterThan(0);
      expect(evt.progress?.percent).toBeGreaterThanOrEqual(0);
      expect(evt.progress?.percent).toBeLessThanOrEqual(100);
    }

    vi.unstubAllGlobals();
  });

  it('builds the correct CDN URL from config', async () => {
    const weights = createFixtureWeightsBuffer();
    const fetchMock = vi.fn().mockResolvedValue(createMockFetchResponse(weights));
    vi.stubGlobal('fetch', fetchMock);

    const { manager } = buildManager();
    await manager.initialize();

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe(
      `${FIXTURE_CDN_BASE_URL}/${FIXTURE_MODEL_ID}/${FIXTURE_MODEL_VERSION}/weights.bin`
    );

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Cache corruption — hash mismatch on cached entry
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 3: Cache corruption recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('purges the corrupted entry and re-downloads', async () => {
    const cachedEntry = buildModelCacheEntryFixture();
    const cache = createMockCacheManager();
    vi.mocked(cache.getModel).mockResolvedValue(cachedEntry);

    // First verify (cache) → invalid; subsequent verify (download) → valid
    const hashVerifier = createMockHashVerifier(false);
    vi.mocked(hashVerifier.verify)
      .mockResolvedValueOnce({ valid: false, computedHash: 'bad', expectedHash: FIXTURE_VALID_HASH })
      .mockResolvedValue({ valid: true, computedHash: FIXTURE_VALID_HASH, expectedHash: FIXTURE_VALID_HASH });

    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const { manager, capture } = buildManager({ cache, hashVerifier });
    await manager.initialize();

    // Should have called deleteModel for the corrupted entry
    expect(vi.mocked(cache.deleteModel)).toHaveBeenCalledWith(FIXTURE_MODEL_ID);

    // Final state should be ready
    expect(capture.lastEvent()?.state).toBe('ready');

    // Event sequence should contain verifying-cache → downloading
    const states = capture.states();
    const verifyCacheIdx = states.indexOf('verifying-cache');
    const downloadingIdx = states.indexOf('downloading');
    expect(verifyCacheIdx).toBeGreaterThanOrEqual(0);
    expect(downloadingIdx).toBeGreaterThan(verifyCacheIdx);
  });

  it('does NOT call purgeStaleVersions on corruption (uses deleteModel instead)', async () => {
    const cache = createMockCacheManager();
    vi.mocked(cache.getModel).mockResolvedValue(buildModelCacheEntryFixture());

    const hashVerifier = createMockHashVerifier(false);
    vi.mocked(hashVerifier.verify)
      .mockResolvedValueOnce({ valid: false, computedHash: 'bad', expectedHash: FIXTURE_VALID_HASH })
      .mockResolvedValue({ valid: true, computedHash: FIXTURE_VALID_HASH, expectedHash: FIXTURE_VALID_HASH });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(createFixtureWeightsBuffer())));

    const { manager } = buildManager({ cache, hashVerifier });
    await manager.initialize();

    expect(vi.mocked(cache.purgeStaleVersions)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Version mismatch (getModel returns null → purge stale → download)
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 4: Version mismatch / stale cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls purgeStaleVersions with the current version on cache miss', async () => {
    const cache = createMockCacheManager();
    vi.mocked(cache.getModel).mockResolvedValue(null); // version mismatch already handled by CacheManager

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createMockFetchResponse(createFixtureWeightsBuffer()))
    );

    const { manager, capture } = buildManager({ cache });
    await manager.initialize();

    expect(vi.mocked(cache.purgeStaleVersions)).toHaveBeenCalledWith(
      FIXTURE_MODEL_ID,
      FIXTURE_MODEL_VERSION
    );
    expect(capture.lastEvent()?.state).toBe('ready');
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Download failure with retry — first 2 fail, third succeeds
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 5: Retry on download failure (2 fail, 3rd succeeds)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries after transient failures and eventually emits READY', async () => {
    const weights = createFixtureWeightsBuffer();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error attempt 1'))
      .mockRejectedValueOnce(new Error('Network error attempt 2'))
      .mockResolvedValueOnce(createMockFetchResponse(weights));

    vi.stubGlobal('fetch', fetchMock);

    const { manager, capture } = buildManager();
    await manager.initialize();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(capture.lastEvent()?.state).toBe('ready');
  });

  it('emits multiple DOWNLOADING state events (one per attempt)', async () => {
    const weights = createFixtureWeightsBuffer();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce(createMockFetchResponse(weights));

    vi.stubGlobal('fetch', fetchMock);

    const { manager, capture } = buildManager();
    await manager.initialize();

    const downloadingStarts = capture.events.filter(
      (e) => e.state === 'downloading' && e.progress?.bytesLoaded === 0
    );
    expect(downloadingStarts.length).toBe(3); // one start event per attempt
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Download failure exhausted — all 3 attempts fail → DEGRADED
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 6: All retries exhausted → DEGRADED', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits DEGRADED with the expected reason after 3 failed attempts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Connection refused'))
    );

    const { manager, capture } = buildManager();
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('degraded');
    expect(capture.lastEvent()?.error).toBe('Download failed after 3 retries');
  });

  it('makes exactly 3 fetch attempts', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', fetchMock);

    const { manager } = buildManager();
    await manager.initialize();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('respects a custom maxRetries value', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('fail'));
    vi.stubGlobal('fetch', fetchMock);

    const { manager, capture } = buildManager({ config: { maxRetries: 2, retryDelays: [0, 0] } });
    await manager.initialize();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(capture.lastEvent()?.state).toBe('degraded');
    expect(capture.lastEvent()?.error).toBe('Download failed after 2 retries');
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: WebGPU unavailable → immediate DEGRADED
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 7: WebGPU unavailable → DEGRADED', () => {
  it('emits DEGRADED immediately without attempting cache or download', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const cache = createMockCacheManager();
    const webgpu = createMockWebGPUDetectorUnsupported('WebGPU not available in this browser');

    const { manager, capture } = buildManager({ webgpu, cache });
    await manager.initialize();

    expect(capture.states()).toEqual(['checking-webgpu', 'degraded']);
    expect(capture.lastEvent()?.error).toBe('WebGPU not available in this browser');
    expect(vi.mocked(cache.getModel)).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('includes the WebGPU unsupported reason in the DEGRADED event', async () => {
    const reason = 'GPU adapter not found — running in a headless environment';
    const webgpu = createMockWebGPUDetectorUnsupported(reason);

    const { manager, capture } = buildManager({ webgpu });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('degraded');
    expect(capture.lastEvent()?.error).toBe(reason);
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: Download abort via AbortController
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Scenario 8: Download abort', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits ERROR with "Download cancelled" on abort and does not retry', async () => {
    // fetch hangs until the AbortSignal fires, then rejects with AbortError
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      const signal = (options as { signal?: AbortSignal }).signal;
      return new Promise<Response>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
          return;
        }
        signal?.addEventListener(
          'abort',
          () => reject(new DOMException('The operation was aborted.', 'AbortError')),
          { once: true }
        );
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const { manager, capture } = buildManager();

    // Start initialize() in the background — it will hang at the fetch call
    const initPromise = manager.initialize();

    // Wait until fetch has been called (download phase entered)
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Abort the in-flight download — this fires the AbortSignal on the fetch call above
    manager.abort();

    await initPromise;

    expect(capture.lastEvent()?.state).toBe('error');
    expect(capture.lastEvent()?.error).toBe('Download cancelled');
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retries after abort
  });
});

// ---------------------------------------------------------------------------
// Scenario 9: Integration — full happy-path lifecycle
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Integration: full happy-path lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('traverses the complete lifecycle from detect to ready with mocked fetch', async () => {
    const weights = createFixtureWeightsBuffer(4096);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createMockFetchResponse(weights, { chunkCount: 4 }))
    );

    const cache = createMockCacheManager();
    // Simulate cold cache: getModel returns null
    vi.mocked(cache.getModel).mockResolvedValue(null);

    const hashVerifier = createMockHashVerifier(true);

    const { manager, capture } = buildManager({ cache, hashVerifier });
    await manager.initialize();

    const states = capture.states();

    // Must start with WebGPU check
    expect(states[0]).toBe('checking-webgpu');
    // Must check cache
    expect(states).toContain('checking-cache');
    // Must download (cold cache path)
    expect(states).toContain('downloading');
    // Must verify the downloaded weights
    expect(states).toContain('verifying-download');
    // Must persist to cache
    expect(states).toContain('caching');
    // Must end with READY
    expect(states[states.length - 1]).toBe('ready');
  });

  it('verifying-cache must NOT appear in the cold-cache download path', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const { manager, capture } = buildManager();
    await manager.initialize();

    expect(capture.states()).not.toContain('verifying-cache');
  });

  it('emits modelId and version on all events after manifest is resolved', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const { manager, capture } = buildManager();
    await manager.initialize();

    // All events from checking-cache onward should have modelId and version
    const postManifest = capture.events.filter((e) => e.state !== 'checking-webgpu');
    for (const evt of postManifest) {
      expect(evt.modelId).toBe(FIXTURE_MODEL_ID);
      expect(evt.version).toBe(FIXTURE_MODEL_VERSION);
    }
  });

  it('hash verifier is called exactly once (post-download verify) in cold-cache path', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const hashVerifier = createMockHashVerifier(true);
    const { manager } = buildManager({ hashVerifier });
    await manager.initialize();

    expect(vi.mocked(hashVerifier.verify)).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('ModelLifecycleManager — Edge cases', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('emits ERROR when manifest has no entry for the configured modelId', async () => {
    const manifest = createMockManifestLoader([
      { id: 'other-model', version: 'v1.0.0', files: [{ filename: 'f.bin', sizeBytes: 0, sha256: 'abc' }] },
    ]);

    const { manager, capture } = buildManager({ manifest });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('error');
    expect(capture.lastEvent()?.error).toContain(FIXTURE_MODEL_ID);
  });

  it('emits ERROR when manifest loader throws', async () => {
    const manifest = vi.fn().mockRejectedValue(new Error('Manifest fetch failed'));

    const { manager, capture } = buildManager({ manifest });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('error');
    expect(capture.lastEvent()?.error).toContain('Manifest fetch failed');
  });

  it('emits ERROR when manifest entry has an empty files array', async () => {
    const manifest = createMockManifestLoader([
      { id: FIXTURE_MODEL_ID, version: FIXTURE_MODEL_VERSION, files: [] },
    ]);

    const { manager, capture } = buildManager({ manifest });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('error');
    expect(capture.lastEvent()?.error).toContain('no files');
  });

  it('proceeds to READY even when storeModel (caching) fails', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    const cache = createMockCacheManager();
    vi.mocked(cache.storeModel).mockResolvedValue(buildCacheStorageError('IndexedDB quota exceeded'));

    const { manager, capture } = buildManager({ cache });
    await manager.initialize();

    // Should still reach READY — weights are available in-memory
    expect(capture.lastEvent()?.state).toBe('ready');
  });

  it('emits DEGRADED when WebGPU detector throws an exception', async () => {
    const webgpu = {
      detect: vi.fn().mockRejectedValue(new Error('GPU init crash')),
    };

    const { manager, capture } = buildManager({ webgpu });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('degraded');
    expect(capture.lastEvent()?.error).toContain('GPU init crash');
  });

  it('emits DEGRADED after hash mismatch on download across all retries', async () => {
    const weights = createFixtureWeightsBuffer();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockFetchResponse(weights)));

    // Hash verifier always returns invalid
    const hashVerifier = createMockHashVerifier(false);
    const { manager, capture } = buildManager({ hashVerifier });
    await manager.initialize();

    expect(capture.lastEvent()?.state).toBe('degraded');
  });

  it('includes download progress events with totalBytes and percent fields', async () => {
    const data = createFixtureWeightsBuffer(2048);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createMockFetchResponse(data, { chunkCount: 2 }))
    );

    const { manager, capture } = buildManager();
    await manager.initialize();

    const progressEvents = capture.progressEvents();
    expect(progressEvents.length).toBeGreaterThan(0);

    const lastProgress = progressEvents[progressEvents.length - 1];
    expect(lastProgress.progress?.totalBytes).toBe(2048);
    expect(lastProgress.progress?.percent).toBe(100);
  });
});
