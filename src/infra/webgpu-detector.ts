/**
 * WebGPUDetector: Stateless, pure-function capability detection for the browser WebGPU API.
 *
 * Checks navigator.gpu availability, requests a GPU adapter, extracts adapter metadata,
 * and returns a structured WebGPUCapability result. The result is cached at module level
 * (singleton pattern) so repeated calls are instant and avoid re-probing the GPU.
 *
 * This module follows the Single Responsibility Principle — it only detects capability.
 * It does not decide what to do with the result; that is the responsibility of callers
 * such as ModelLifecycleManager and ScanOrchestrator.
 *
 * @note Running in a Web Worker context: navigator.gpu may behave differently than on the
 *       main thread. This module does not guard against Worker-specific quirks.
 * @note All browser API errors are caught and converted to supported=false results.
 *       This module never throws exceptions to callers.
 */

import type { WebGPUCapability } from '@/types/webgpu';

/** Maximum milliseconds to wait for requestAdapter() before treating as unsupported */
const ADAPTER_TIMEOUT_MS = 5000;

/** Module-level singleton cache — null means detection has not yet run */
let cachedResult: WebGPUCapability | null = null;

/**
 * WebGPUDetector provides a single static async detect() entry point for probing
 * WebGPU capability in the current browser environment.
 */
export class WebGPUDetector {
  private constructor() {
    // Static-only utility class — instantiation is disallowed
  }

  /**
   * Detects WebGPU capability for the current browser environment.
   *
   * On the first call, probes navigator.gpu, requests a GPU adapter, and caches the result.
   * Subsequent calls return the cached result immediately without re-probing the GPU.
   *
   * @returns A fully typed WebGPUCapability object. Never throws.
   */
  static async detect(): Promise<WebGPUCapability> {
    if (cachedResult !== null) {
      return cachedResult;
    }

    cachedResult = await WebGPUDetector.probe();
    return cachedResult;
  }

  /**
   * Internal GPU probe. Isolated from detect() to keep the caching logic simple.
   * All paths always return a valid WebGPUCapability — no exceptions escape.
   */
  private static async probe(): Promise<WebGPUCapability> {
    const startTime = performance.now();

    // navigator.gpu is typed as GPU in TypeScript's DOM lib but is absent at runtime
    // in browsers that do not support WebGPU. We cast through unknown to safely express
    // the optional type that reflects real-world browser behaviour.
    const gpu: GPU | undefined = (navigator as unknown as { gpu?: GPU }).gpu;

    if (!gpu) {
      return {
        supported: false,
        reason: 'WebGPU API not available in this browser',
        detectionTimeMs: performance.now() - startTime,
      };
    }

    // Race the adapter request against a timeout to guard against GPU drivers that hang
    let adapter: GPUAdapter | null;
    try {
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), ADAPTER_TIMEOUT_MS)
      );
      adapter = await Promise.race([gpu.requestAdapter(), timeoutPromise]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[WebGPUDetector] requestAdapter() threw an error:', message);
      return {
        supported: false,
        reason: message,
        detectionTimeMs: performance.now() - startTime,
      };
    }

    if (!adapter) {
      return {
        supported: false,
        reason: 'No suitable GPU adapter found',
        detectionTimeMs: performance.now() - startTime,
      };
    }

    // Extract adapter hardware metadata for downstream decisions (e.g., VRAM estimation)
    let adapterInfo = { vendor: '', architecture: '', description: '' };
    try {
      // GPUAdapter.info is the standardised synchronous property (Chrome 121+, TypeScript 5.4+ DOM lib)
      const info: GPUAdapterInfo = adapter.info;
      adapterInfo = {
        vendor: info.vendor,
        architecture: info.architecture,
        description: info.description,
      };
    } catch {
      // Partial WebGPU polyfills may throw when accessing .info — degrade gracefully
      console.warn('[WebGPUDetector] Could not retrieve GPU adapter info');
    }

    return {
      supported: true,
      adapterInfo,
      detectionTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Resets the module-level detection cache.
   *
   * **Intended for test isolation only.** Production code must never call this method,
   * as the cache is designed to persist for the full session lifetime.
   *
   * @internal
   */
  static resetCache(): void {
    cachedResult = null;
  }
}
