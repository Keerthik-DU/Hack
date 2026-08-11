import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useScanEngine } from '../useScanEngine';
import { mockScanError } from '../__fixtures__/scan-mocks';

describe('useScanEngine Custom Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('initializes in idle status with null results and error', () => {
    const { result } = renderHook(() => useScanEngine({ scanDelayMs: 200 }));

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.capabilities).toBeDefined();
  });

  it('transitions through idle -> scanning -> complete on successful scan execution', async () => {
    const { result } = renderHook(() => useScanEngine({ scanDelayMs: 200 }));

    let promise: Promise<void>;
    act(() => {
      promise = result.current.triggerScan('const secret = "AKIA12345";');
    });

    expect(result.current.status).toBe('scanning');

    await act(async () => {
      vi.advanceTimersByTime(200);
      await promise;
    });

    expect(result.current.status).toBe('complete');
    expect(result.current.results).not.toBeNull();
    expect(result.current.results?.percentage).toBe(100);
    expect(result.current.error).toBeNull();
  });

  it('transitions through scanning -> error on failure and propagates user-friendly ScanError', async () => {
    const { result } = renderHook(() =>
      useScanEngine({
        scanDelayMs: 200,
        shouldFail: true,
        simulatedError: mockScanError,
      })
    );

    let promise: Promise<void>;
    act(() => {
      promise = result.current.triggerScan('const token = "secret";');
    });

    expect(result.current.status).toBe('scanning');

    await act(async () => {
      vi.advanceTimersByTime(200);
      await promise;
    });

    expect(result.current.status).toBe('error');
    expect(result.current.results).toBeNull();
    expect(result.current.error).toEqual(mockScanError);
    expect(result.current.error?.failedLayer).toBe('Regex Engine (Layer 1)');
  });

  it('aborts active scan cleanly when abort() is invoked', async () => {
    const { result } = renderHook(() => useScanEngine({ scanDelayMs: 500 }));

    act(() => {
      result.current.triggerScan('some text');
    });

    expect(result.current.status).toBe('scanning');

    act(() => {
      result.current.abort();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toBeNull();
  });
});
