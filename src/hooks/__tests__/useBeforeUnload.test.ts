import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeforeUnload } from '../useBeforeUnload';

describe('useBeforeUnload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers handler when condition is true and removes on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useBeforeUnload(true));
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does not register when condition is false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useBeforeUnload(false));
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
