import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClipboard } from './useClipboard';

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const mockWriteText = vi.fn();

function assignClipboard(writeText: typeof mockWriteText | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText !== undefined ? { writeText } : undefined,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WO-032: useClipboard hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    assignClipboard(mockWriteText);
    mockWriteText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('returns copied=false and error=null in initial state', () => {
    const { result } = renderHook(() => useClipboard());

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.copy).toBe('function');
  });

  // ── Success path ───────────────────────────────────────────────────────────

  it('sets copied=true after a successful copy', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('hello clipboard');
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockWriteText).toHaveBeenCalledOnce();
    expect(mockWriteText).toHaveBeenCalledWith('hello clipboard');
  });

  it('copy returns a Promise (AC-1)', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    let returnValue: unknown;
    act(() => {
      returnValue = result.current.copy('test');
    });

    expect(returnValue).toBeInstanceOf(Promise);
    // Await to prevent unhandled rejection
    await act(async () => {
      await returnValue as Promise<void>;
    });
  });

  // ── Auto-reset ─────────────────────────────────────────────────────────────

  it('auto-resets copied to false after exactly 2 seconds (AC-2)', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.copied).toBe(true);

    // Advance to just before the reset threshold — still true
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.copied).toBe(true);

    // Advance the final millisecond — now resets
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  // ── Failure path ───────────────────────────────────────────────────────────

  it('sets error with the thrown message when writeText rejects (AC-3)', async () => {
    mockWriteText.mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('secret');
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe('Permission denied');
  });

  it('sets a generic error message when a non-Error is thrown', async () => {
    mockWriteText.mockRejectedValue('some string error');
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('secret');
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe('Failed to copy to clipboard');
  });

  // ── Clipboard API unavailable ──────────────────────────────────────────────

  it('sets error when navigator.clipboard is undefined — insecure context (AC-3)', async () => {
    assignClipboard(undefined);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe('Clipboard API not available in this environment');
  });

  // ── Clears previous error on next copy attempt ─────────────────────────────

  it('clears a previous error when a new copy is initiated', async () => {
    // First call fails
    mockWriteText.mockRejectedValueOnce(new Error('Permission denied'));
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('text');
    });

    expect(result.current.error).toBe('Permission denied');

    // Second call succeeds — error should be cleared
    mockWriteText.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.copy('text');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.copied).toBe(true);
  });

  // ── Rapid successive calls ─────────────────────────────────────────────────

  it('resets the auto-reset timer on rapid successive clicks', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    // First copy
    await act(async () => {
      await result.current.copy('first');
    });

    expect(result.current.copied).toBe(true);

    // Advance 1000ms (first timer half-expired)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.copied).toBe(true);

    // Second copy — should reset the timer to a fresh 2s
    await act(async () => {
      await result.current.copy('second');
    });

    // Advance another 1000ms — 2000ms since first copy, but only 1000ms since second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Should still be true (timer reset to full 2s from second click)
    expect(result.current.copied).toBe(true);

    // Advance the remaining 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Now the timer from the second click has expired
    expect(result.current.copied).toBe(false);
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  it('clears pending timeout on unmount to prevent setState on unmounted component', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('test');
    });

    expect(result.current.copied).toBe(true);

    // Unmount while timer is still pending
    unmount();

    // Advancing time should not throw (timer has been cleared)
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });

  // ── Empty string ───────────────────────────────────────────────────────────

  it('handles empty string copy without error', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy('');
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockWriteText).toHaveBeenCalledWith('');
  });
});
