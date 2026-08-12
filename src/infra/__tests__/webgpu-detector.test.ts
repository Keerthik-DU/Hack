/**
 * Unit tests for WebGPUDetector
 *
 * Covers all four detection paths described in the WO-034 testing strategy:
 *   1. Full success  — navigator.gpu present, requestAdapter resolves to a valid adapter
 *   2. No API        — navigator.gpu is undefined (Firefox < 141, older Safari)
 *   3. Null adapter  — navigator.gpu present but requestAdapter() returns null
 *   4. Adapter error — requestAdapter() throws a DOMException (or any Error)
 *   5. Caching       — detect() called twice, requestAdapter() invoked only once
 *
 * All tests mock navigator.gpu so no real GPU hardware is required.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebGPUDetector } from '../webgpu-detector';
import {
  createMockGPUWithAdapter,
  createMockGPUWithNullAdapter,
  createMockGPUThatThrows,
  installMockGPU,
} from '@/test-utils/mock-webgpu';

/** No-op stub used as safe default for cleanup before each describe block's beforeEach runs */
const noop = () => {};

describe('WebGPUDetector', () => {
  // Reset the module-level cache before every test so each scenario starts fresh
  beforeEach(() => {
    WebGPUDetector.resetCache();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Path 1: Full success — navigator.gpu present with a valid adapter
  // ──────────────────────────────────────────────────────────────────────────

  describe('Success path: navigator.gpu present, requestAdapter() resolves to a valid adapter', () => {
    let cleanup: () => void = noop;

    beforeEach(() => {
      cleanup = installMockGPU(
        createMockGPUWithAdapter({
          vendor: 'nvidia',
          architecture: 'ampere',
          device: 'NVIDIA GeForce RTX 3090',
          description: 'NVIDIA GeForce RTX 3090',
        })
      );
    });

    afterEach(() => cleanup());

    it('returns supported=true', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.supported).toBe(true);
    });

    it('populates adapterInfo with vendor, architecture, and description', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.adapterInfo).toBeDefined();
      expect(result.adapterInfo?.vendor).toBe('nvidia');
      expect(result.adapterInfo?.architecture).toBe('ampere');
      expect(result.adapterInfo?.description).toBe('NVIDIA GeForce RTX 3090');
    });

    it('does not include a reason field', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.reason).toBeUndefined();
    });

    it('includes a non-negative detectionTimeMs', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Path 2: No API — navigator.gpu is absent
  // ──────────────────────────────────────────────────────────────────────────

  describe('No API path: navigator.gpu is undefined (older browsers without WebGPU support)', () => {
    let cleanup: () => void = noop;

    beforeEach(() => {
      // Explicitly install undefined to simulate a browser where navigator.gpu does not exist
      cleanup = installMockGPU(undefined);
    });

    afterEach(() => cleanup());

    it('returns supported=false', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.supported).toBe(false);
    });

    it('sets reason to the expected missing-API message', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.reason).toBe('WebGPU API not available in this browser');
    });

    it('leaves adapterInfo undefined', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.adapterInfo).toBeUndefined();
    });

    it('includes a non-negative detectionTimeMs', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Path 3: Null adapter — navigator.gpu present but requestAdapter() returns null
  // ──────────────────────────────────────────────────────────────────────────

  describe('Null adapter path: navigator.gpu present, requestAdapter() returns null', () => {
    let cleanup: () => void = noop;

    beforeEach(() => {
      cleanup = installMockGPU(createMockGPUWithNullAdapter());
    });

    afterEach(() => cleanup());

    it('returns supported=false', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.supported).toBe(false);
    });

    it('sets reason to the expected no-adapter message', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.reason).toBe('No suitable GPU adapter found');
    });

    it('leaves adapterInfo undefined', async () => {
      const result = await WebGPUDetector.detect();
      expect(result.adapterInfo).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Path 4: Adapter error — requestAdapter() throws
  // ──────────────────────────────────────────────────────────────────────────

  describe('Adapter error path: requestAdapter() throws', () => {
    let cleanup: () => void = noop;

    afterEach(() => cleanup());

    it('returns supported=false without throwing to the caller when a DOMException is thrown', async () => {
      cleanup = installMockGPU(
        createMockGPUThatThrows(
          new DOMException('GPU adapter request failed: device lost', 'NotSupportedError')
        )
      );

      await expect(WebGPUDetector.detect()).resolves.toMatchObject({ supported: false });
    });

    it('surfaces the original DOMException message in the reason field', async () => {
      cleanup = installMockGPU(
        createMockGPUThatThrows(
          new DOMException('GPU adapter request failed: device lost', 'NotSupportedError')
        )
      );

      const result = await WebGPUDetector.detect();
      expect(result.reason).toBe('GPU adapter request failed: device lost');
    });

    it('surfaces a generic Error message in the reason field', async () => {
      cleanup = installMockGPU(
        createMockGPUThatThrows(new Error('Unexpected GPU failure'))
      );

      const result = await WebGPUDetector.detect();
      expect(result.supported).toBe(false);
      expect(result.reason).toBe('Unexpected GPU failure');
    });

    it('leaves adapterInfo undefined when requestAdapter() throws', async () => {
      cleanup = installMockGPU(createMockGPUThatThrows());

      const result = await WebGPUDetector.detect();
      expect(result.adapterInfo).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Path 5: Caching — detect() called multiple times
  // ──────────────────────────────────────────────────────────────────────────

  describe('Caching behaviour: subsequent calls return cached result without re-probing', () => {
    let cleanup: () => void = noop;

    afterEach(() => cleanup());

    it('calls requestAdapter() exactly once across two detect() invocations', async () => {
      const mockGpu = createMockGPUWithAdapter();
      cleanup = installMockGPU(mockGpu);

      await WebGPUDetector.detect();
      await WebGPUDetector.detect();

      expect(mockGpu.requestAdapter).toHaveBeenCalledTimes(1);
    });

    it('returns the identical result object reference on the second call', async () => {
      cleanup = installMockGPU(createMockGPUWithAdapter());

      const first = await WebGPUDetector.detect();
      const second = await WebGPUDetector.detect();

      expect(second).toBe(first);
    });

    it('caches a supported=false result and does not re-probe on subsequent calls', async () => {
      const mockGpu = createMockGPUWithNullAdapter();
      cleanup = installMockGPU(mockGpu);

      await WebGPUDetector.detect();
      await WebGPUDetector.detect();

      expect(mockGpu.requestAdapter).toHaveBeenCalledTimes(1);
    });

    it('resetCache() allows a fresh probe on the next call', async () => {
      const mockGpu = createMockGPUWithAdapter();
      cleanup = installMockGPU(mockGpu);

      await WebGPUDetector.detect();
      WebGPUDetector.resetCache();
      await WebGPUDetector.detect();

      expect(mockGpu.requestAdapter).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // detectionTimeMs — present and valid in every result shape
  // ──────────────────────────────────────────────────────────────────────────

  describe('detectionTimeMs field', () => {
    let cleanup: () => void = noop;

    afterEach(() => cleanup());

    it('is a finite non-negative number for a successful detection', async () => {
      cleanup = installMockGPU(createMockGPUWithAdapter());

      const result = await WebGPUDetector.detect();
      expect(Number.isFinite(result.detectionTimeMs)).toBe(true);
      expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('is a finite non-negative number when the API is absent', async () => {
      cleanup = installMockGPU(undefined);

      const result = await WebGPUDetector.detect();
      expect(Number.isFinite(result.detectionTimeMs)).toBe(true);
      expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
