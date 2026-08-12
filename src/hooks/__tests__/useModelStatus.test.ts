/**
 * WO-043: useModelStatus hook tests
 *
 * Verifies that the hook correctly:
 *   1. Returns 'checking' state during async detection
 *   2. Returns 'unavailable' when WebGPU detection fails (navigator.gpu absent or adapter failure)
 *   3. Returns 'ready' when WebGPU detection succeeds
 *   4. Treats memory pressure as an unavailability signal even when WebGPU is technically supported
 *   5. Exposes the raw WebGPUCapability result and a human-readable reason string
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModelStatus } from '../useModelStatus';
import { WebGPUDetector } from '@/infra/webgpu-detector';
import {
  webgpuSupported,
  webgpuUnsupported,
  webgpuAdapterFailure,
  webgpuMemoryPressure,
} from '@/__fixtures__/webgpu-mocks';

describe('WO-043: useModelStatus hook', () => {
  beforeEach(() => {
    WebGPUDetector.resetCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    WebGPUDetector.resetCache();
    vi.restoreAllMocks();
  });

  // ─── Initial checking state ───────────────────────────────────────────────

  it('returns modelState=checking and llm=loading during async WebGPU detection', () => {
    // Make detect() never resolve during this test
    vi.spyOn(WebGPUDetector, 'detect').mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useModelStatus());

    // Initial render should be in the checking phase
    expect(result.current.modelState).toBe('checking');
    expect(result.current.llm).toBe('loading');
  });

  it('returns regex=ready and entropy=ready even during initial checking phase', () => {
    vi.spyOn(WebGPUDetector, 'detect').mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useModelStatus());

    expect(result.current.regex).toBe('ready');
    expect(result.current.entropy).toBe('ready');
  });

  // ─── WebGPU fully supported ───────────────────────────────────────────────

  it('returns llm=ready and webgpuAvailable=true when WebGPU is fully supported', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuSupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => {
      expect(result.current.llm).toBe('ready');
    });

    expect(result.current.webgpuAvailable).toBe(true);
    expect(result.current.modelState).toBe('ready');
    expect(result.current.webgpuCapability).toEqual(webgpuSupported);
  });

  it('returns no degradedMessage when WebGPU is fully supported', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuSupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.modelState).toBe('ready'));

    expect(result.current.degradedMessage).toBeUndefined();
    expect(result.current.webgpuUnavailableReason).toBeUndefined();
  });

  // ─── WebGPU unavailable (navigator.gpu absent) ───────────────────────────

  it('returns llm=unavailable and webgpuAvailable=false when navigator.gpu is absent', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuUnsupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => {
      expect(result.current.llm).toBe('unavailable');
    });

    expect(result.current.webgpuAvailable).toBe(false);
    expect(result.current.modelState).toBe('unavailable');
  });

  it('exposes the detection reason as webgpuUnavailableReason when navigator.gpu is absent', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuUnsupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.llm).toBe('unavailable'));

    expect(result.current.webgpuUnavailableReason).toBe(
      'WebGPU API not available in this browser'
    );
  });

  it('exposes a degradedMessage when WebGPU is unavailable', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuUnsupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.llm).toBe('unavailable'));

    expect(result.current.degradedMessage).toBeTruthy();
    expect(result.current.degradedMessage).toContain('regex and entropy');
  });

  // ─── WebGPU adapter failure ───────────────────────────────────────────────

  it('returns llm=unavailable when requestAdapter() returned null', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuAdapterFailure);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.llm).toBe('unavailable'));

    expect(result.current.webgpuUnavailableReason).toBe('No suitable GPU adapter found');
  });

  // ─── Memory pressure ─────────────────────────────────────────────────────

  it('returns llm=unavailable when memory pressure is critical even though WebGPU is supported', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuMemoryPressure);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => {
      expect(result.current.llm).toBe('unavailable');
    });

    expect(result.current.webgpuAvailable).toBe(false);
  });

  it('reports "memory pressure" as the unavailability reason when heap exceeds threshold', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuMemoryPressure);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.llm).toBe('unavailable'));

    expect(result.current.webgpuUnavailableReason).toBe(
      'Memory pressure too high for LLM inference'
    );
  });

  // ─── Regex and Entropy always ready ──────────────────────────────────────

  it('regex and entropy are always ready regardless of WebGPU state', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuUnsupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.llm).toBe('unavailable'));

    expect(result.current.regex).toBe('ready');
    expect(result.current.entropy).toBe('ready');
  });

  // ─── webgpuCapability exposed ─────────────────────────────────────────────

  it('exposes the raw WebGPUCapability object for downstream consumers', async () => {
    vi.spyOn(WebGPUDetector, 'detect').mockResolvedValue(webgpuUnsupported);

    const { result } = renderHook(() => useModelStatus());

    await waitFor(() => expect(result.current.modelState).toBe('unavailable'));

    expect(result.current.webgpuCapability).toEqual(webgpuUnsupported);
  });
});
