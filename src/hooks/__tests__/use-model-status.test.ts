import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLifecycleModelStatus, type ModelLifecycleSource } from '../use-model-status';
import {
  lifecycleDownloading,
  lifecycleReady,
  lifecycleSequence,
} from '@/test-utils/model-status-fixtures';
import type { ModelLifecycleEvent } from '@/types/model-lifecycle';

function createMockSource(initial: ModelLifecycleEvent['state'] = 'idle') {
  let listener: ((e: ModelLifecycleEvent) => void) | null = null;
  const source: ModelLifecycleSource = {
    getState: () => initial,
    subscribe: (fn) => {
      listener = fn;
      return () => {
        listener = null;
      };
    },
    initialize: vi.fn(async () => {
      listener?.({ state: 'ready' });
    }),
  };
  return {
    source,
    emit: (event: ModelLifecycleEvent) => listener?.(event),
  };
}

describe('useLifecycleModelStatus', () => {
  it('starts idle with null progress', () => {
    const { source } = createMockSource('idle');
    const { result } = renderHook(() => useLifecycleModelStatus(source));
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.isLLMAvailable).toBe(false);
  });

  it('transitions through lifecycle sequence to ready', () => {
    const { source, emit } = createMockSource();
    const { result } = renderHook(() => useLifecycleModelStatus(source));
    act(() => {
      for (const event of lifecycleSequence) emit(event);
    });
    expect(result.current.status).toBe('ready');
    expect(result.current.isLLMAvailable).toBe(true);
  });

  it('updates progress during download', () => {
    const { source, emit } = createMockSource();
    const { result } = renderHook(() => useLifecycleModelStatus(source));
    act(() => emit(lifecycleDownloading));
    expect(result.current.progress?.percent).toBe(30);
  });

  it('initializeModel triggers source.initialize', async () => {
    const { source } = createMockSource();
    const { result } = renderHook(() => useLifecycleModelStatus(source));
    await act(async () => {
      await result.current.initializeModel('phi');
    });
    expect(source.initialize).toHaveBeenCalled();
    expect(result.current.status).toBe('ready');
  });

  it('ready event clears unavailable flag', () => {
    const { source, emit } = createMockSource();
    const { result } = renderHook(() => useLifecycleModelStatus(source));
    act(() => emit(lifecycleReady));
    expect(result.current.isLLMAvailable).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
