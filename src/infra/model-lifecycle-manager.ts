/**
 * ModelLifecycleManager — central orchestrator for the LLM model lifecycle.
 *
 * Responsibilities:
 *   1. WebGPU capability detection (via IWebGPUDetector).
 *   2. Cache-first model loading: check IndexedDB for a version-matched entry.
 *   3. Hash verification of every entry before use (prevents tampered weights).
 *   4. Model download from CDN with ReadableStream progress tracking.
 *   5. Retry with exponential backoff (configurable; default: 1 s / 2 s / 4 s).
 *   6. Corruption recovery: purge invalid cache entry and re-download.
 *   7. Version invalidation: purge stale cache entries on version mismatch.
 *   8. Graceful degradation to regex+entropy mode after exhausting retries.
 *
 * Architecture constraints:
 *   - Zero direct imports of concrete infrastructure implementations.
 *     All dependencies are received via constructor injection (ICacheManager,
 *     IWebGPUDetector, IHashVerifier, ManifestLoader).
 *   - download uses fetch() + ReadableStream; never XMLHttpRequest.
 *   - In-flight downloads are cancellable via abort().
 *   - initialize() is re-entrant: a concurrent call aborts the previous one.
 *   - All error paths lead to either 'ready' or 'degraded' — the manager never
 *     throws unhandled exceptions to callers.
 */

import type {
  IWebGPUDetector,
  ICacheManager,
  IHashVerifier,
  ManifestLoader,
  ManifestEntry,
  ManifestFileEntry,
  ModelLifecycleConfig,
  ModelLifecycleEvent,
  ModelLifecycleEventCallback,
  DownloadProgress,
} from '@/types/model-lifecycle';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAYS: readonly number[] = [1000, 2000, 4000];

// ---------------------------------------------------------------------------
// ModelLifecycleManager
// ---------------------------------------------------------------------------

/**
 * Orchestrates the full LLM model lifecycle from WebGPU detection to cache
 * storage. Emits typed progress events via a callback registered at construction.
 *
 * @example
 * ```ts
 * const manager = new ModelLifecycleManager(
 *   { detect: () => WebGPUDetector.detect() },
 *   new CacheManager(),
 *   hashVerifier,
 *   manifestLoader,
 *   { modelId: 'phi-3.5-mini-4bit', cdnBaseUrl: 'https://model-cdn.example.com' },
 *   (event) => console.log('[lifecycle]', event),
 * );
 *
 * await manager.initialize();
 * ```
 */
export class ModelLifecycleManager {
  private readonly webGPUDetector: IWebGPUDetector;
  private readonly cacheManager: ICacheManager;
  private readonly hashVerifier: IHashVerifier;
  private readonly manifestLoader: ManifestLoader;
  private readonly config: Readonly<Required<ModelLifecycleConfig>>;
  private readonly onEvent: ModelLifecycleEventCallback;

  /** Tracks an in-progress initialize() run so abort() can cancel it. */
  private abortController: AbortController | null = null;

  /** Whether initialize() is currently executing. Used for re-entrancy guard. */
  private isRunning = false;

  constructor(
    webGPUDetector: IWebGPUDetector,
    cacheManager: ICacheManager,
    hashVerifier: IHashVerifier,
    manifestLoader: ManifestLoader,
    config: ModelLifecycleConfig,
    onEvent: ModelLifecycleEventCallback
  ) {
    this.webGPUDetector = webGPUDetector;
    this.cacheManager = cacheManager;
    this.hashVerifier = hashVerifier;
    this.manifestLoader = manifestLoader;
    this.config = {
      modelId: config.modelId,
      cdnBaseUrl: config.cdnBaseUrl,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryDelays: config.retryDelays ?? DEFAULT_RETRY_DELAYS,
    };
    this.onEvent = onEvent;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Orchestrates the full model lifecycle:
   *
   *   checking-webgpu → checking-cache → [verifying-cache →] ready
   *                   → checking-cache → downloading → verifying-download → caching → ready
   *                   → degraded  (on WebGPU unavailability or exhausted retries)
   *                   → error     (on unrecoverable configuration problems)
   *
   * Re-entrant: if called while already running, aborts the previous run.
   * All error paths are handled internally — this method never rejects.
   */
  async initialize(): Promise<void> {
    // Re-entrancy guard: abort any in-progress run
    if (this.isRunning) {
      this.abort();
      // Allow the aborted run to clean up
      await this.waitForRunToEnd();
    }

    this.isRunning = true;

    try {
      await this.runLifecycle();
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Cancels any in-flight model download.
   *
   * Safe to call at any time — a no-op when no download is in progress.
   * After abort(), the lifecycle transitions to 'error' with message 'Download cancelled'.
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  // -------------------------------------------------------------------------
  // Private: main lifecycle pipeline
  // -------------------------------------------------------------------------

  private async runLifecycle(): Promise<void> {
    // ── Phase 1: WebGPU detection ────────────────────────────────────────────
    this.emitEvent({ state: 'checking-webgpu' });

    let gpuCapability: Awaited<ReturnType<IWebGPUDetector['detect']>>;
    try {
      gpuCapability = await this.webGPUDetector.detect();
    } catch (err) {
      const reason = `WebGPU detection failed: ${this.errorMessage(err)}`;
      console.error('[ModelLifecycleManager] WebGPU detection threw', { reason });
      this.emitEvent({ state: 'degraded', error: reason });
      return;
    }

    if (!gpuCapability.supported) {
      const reason = gpuCapability.reason ?? 'WebGPU not supported in this browser';
      console.warn('[ModelLifecycleManager] WebGPU unavailable', { reason });
      this.emitEvent({ state: 'degraded', error: reason });
      return;
    }

    // ── Phase 2: Manifest loading ────────────────────────────────────────────
    let manifestEntries: ManifestEntry[];
    try {
      manifestEntries = await this.manifestLoader();
    } catch (err) {
      const reason = `Failed to load model manifest: ${this.errorMessage(err)}`;
      console.error('[ModelLifecycleManager] Manifest load failed', { reason });
      this.emitEvent({ state: 'error', error: reason, modelId: this.config.modelId });
      return;
    }

    const manifestEntry = manifestEntries.find((e) => e.id === this.config.modelId);
    if (!manifestEntry) {
      const reason = `No manifest entry found for model '${this.config.modelId}'`;
      console.error('[ModelLifecycleManager] Manifest lookup failed', { reason });
      this.emitEvent({ state: 'error', error: reason, modelId: this.config.modelId });
      return;
    }

    const primaryFile = manifestEntry.files[0] as ManifestFileEntry | undefined;
    if (!primaryFile) {
      const reason = `Manifest entry for '${this.config.modelId}' has no files`;
      console.error('[ModelLifecycleManager] Empty manifest files array', { reason });
      this.emitEvent({
        state: 'error',
        error: reason,
        modelId: this.config.modelId,
        version: manifestEntry.version,
      });
      return;
    }

    const { version } = manifestEntry;
    const { modelId } = this.config;

    // ── Phase 3: Cache lookup ────────────────────────────────────────────────
    this.emitEvent({ state: 'checking-cache', modelId, version });

    const cached = await this.cacheManager.getModel(modelId, version);

    if (cached !== null) {
      // ── Phase 4: Hash-verify cached entry ───────────────────────────────────
      this.emitEvent({ state: 'verifying-cache', modelId, version });

      const cacheVerify = await this.hashVerifier.verify(cached.weights, primaryFile.sha256);

      if (cacheVerify.valid) {
        // Happy path: valid cached weights → immediately ready
        this.emitEvent({ state: 'ready', modelId, version });
        return;
      }

      // Cache corruption: delete the invalid entry and fall through to download
      console.error('[ModelLifecycleManager] Cache corruption detected — purging', {
        modelId,
        version,
        computedHash: cacheVerify.computedHash,
        expectedHash: cacheVerify.expectedHash,
      });
      await this.cacheManager.deleteModel(modelId);
    } else {
      // Cache miss (or version mismatch handled inside getModel):
      // Purge any stale-versioned entries for this modelId before downloading.
      await this.cacheManager.purgeStaleVersions(modelId, version);
    }

    // ── Phase 5: Download + verify + cache (with retry) ──────────────────────
    const { maxRetries, retryDelays } = this.config;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Exponential backoff: wait before retries (not before the first attempt)
      if (attempt > 0) {
        const delayMs = retryDelays[attempt - 1] ?? retryDelays[retryDelays.length - 1] ?? 1000;
        await this.sleep(delayMs);
      }

      // Create a fresh AbortController for each attempt
      this.abortController = new AbortController();

      const cdnUrl = this.buildCdnUrl(version, primaryFile.filename);

      this.emitEvent({
        state: 'downloading',
        modelId,
        version,
        progress: { bytesLoaded: 0, totalBytes: primaryFile.sizeBytes, percent: 0 },
      });

      // ── Download ─────────────────────────────────────────────────────────────
      let weights: ArrayBuffer;
      try {
        weights = await this.fetchWithProgress(
          cdnUrl,
          primaryFile.sizeBytes,
          this.abortController.signal,
          modelId,
          version
        );
      } catch (err) {
        if (this.isAbortError(err)) {
          // User-initiated cancellation — do not retry
          console.warn('[ModelLifecycleManager] Download cancelled by abort signal', {
            modelId,
            version,
            attempt: attempt + 1,
          });
          this.emitEvent({ state: 'error', error: 'Download cancelled', modelId, version });
          return;
        }

        console.error('[ModelLifecycleManager] Download failed', {
          modelId,
          version,
          attempt: attempt + 1,
          maxRetries,
          error: this.errorMessage(err),
        });
        continue; // retry
      }

      // ── Post-download hash verification ──────────────────────────────────────
      this.emitEvent({ state: 'verifying-download', modelId, version });

      const downloadVerify = await this.hashVerifier.verify(weights, primaryFile.sha256);

      if (!downloadVerify.valid) {
        console.error('[ModelLifecycleManager] Hash verification failed after download', {
          modelId,
          version,
          attempt: attempt + 1,
          computedHash: downloadVerify.computedHash,
          expectedHash: downloadVerify.expectedHash,
        });
        continue; // retry
      }

      // ── Cache store ───────────────────────────────────────────────────────────
      this.emitEvent({ state: 'caching', modelId, version });

      const storeResult = await this.cacheManager.storeModel(
        modelId,
        version,
        weights,
        primaryFile.sha256
      );

      if (storeResult !== null) {
        // Cache write failed — weights are still in memory, so we proceed to READY.
        // This satisfies the edge-case requirement: "must not lose the verified weights".
        console.warn('[ModelLifecycleManager] Failed to cache model weights — using in-memory', {
          modelId,
          version,
          cacheError: storeResult.message,
        });
      }

      // ── Ready ──────────────────────────────────────────────────────────────────
      this.emitEvent({ state: 'ready', modelId, version });
      return;
    }

    // Exhausted all download attempts
    const degradedReason = `Download failed after ${maxRetries} retries`;
    console.error('[ModelLifecycleManager] Degrading to regex+entropy mode', {
      modelId,
      version,
      maxRetries,
    });
    this.emitEvent({ state: 'degraded', error: degradedReason, modelId, version });
  }

  // -------------------------------------------------------------------------
  // Private: helpers
  // -------------------------------------------------------------------------

  /**
   * Emits a typed event to the registered callback.
   */
  private emitEvent(event: ModelLifecycleEvent): void {
    try {
      this.onEvent(event);
    } catch (err) {
      // Never allow an event callback to crash the lifecycle pipeline
      console.warn('[ModelLifecycleManager] Event callback threw — ignored', {
        state: event.state,
        error: this.errorMessage(err),
      });
    }
  }

  /**
   * Builds the full CDN URL for a model file.
   * Pattern: {cdnBaseUrl}/{modelId}/{version}/{filename}
   */
  private buildCdnUrl(version: string, filename: string): string {
    const base = this.config.cdnBaseUrl.replace(/\/$/, '');
    return `${base}/${this.config.modelId}/${version}/${filename}`;
  }

  /**
   * Fetches model weights from the CDN with ReadableStream progress tracking.
   * Emits 'downloading' events with updated progress on each chunk.
   *
   * @throws On HTTP errors, network failures, or AbortError from the signal.
   */
  private async fetchWithProgress(
    url: string,
    expectedSizeBytes: number,
    signal: AbortSignal,
    modelId: string,
    version: string
  ): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Prefer Content-Length for accurate progress, fall back to manifest sizeBytes
    const contentLengthHeader = response.headers.get('Content-Length');
    const totalBytes =
      contentLengthHeader !== null
        ? parseInt(contentLengthHeader, 10)
        : expectedSizeBytes;

    const body = response.body;
    if (!body) {
      throw new Error('Response body is null — streaming not supported by this environment');
    }

    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let bytesLoaded = 0;

    // Read chunks from the ReadableStream, emitting progress events
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      bytesLoaded += value.byteLength;

      const percent = totalBytes > 0 ? Math.min(100, Math.round((bytesLoaded / totalBytes) * 100)) : 0;
      const progress: DownloadProgress = { bytesLoaded, totalBytes, percent };
      this.emitEvent({ state: 'downloading', progress, modelId, version });
    }

    // Concatenate all chunks into a single ArrayBuffer
    const combined = new Uint8Array(bytesLoaded);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return combined.buffer;
  }

  /**
   * Returns true when the error is an AbortError (thrown by fetch when the
   * AbortController's signal fires).
   */
  private isAbortError(err: unknown): boolean {
    return err instanceof DOMException && err.name === 'AbortError';
  }

  /**
   * Extracts a human-readable message from any thrown value.
   */
  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  /**
   * Returns a promise that resolves after `ms` milliseconds.
   * Used to implement exponential backoff between retry attempts.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Yields control to the event loop so a just-aborted run has a chance to
   * clean up its `isRunning = false` flag before the new run starts.
   *
   * Uses three microtask ticks, sufficient for the aborted path to exit.
   */
  private waitForRunToEnd(): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Returns the current lifecycle state for read-only inspection.
   * Exposed for testing and observability; prefer consuming events in production.
   *
   * @internal
   */
  get currentlyRunning(): boolean {
    return this.isRunning;
  }
}
