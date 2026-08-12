import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CopyToast } from './CopyToast';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WO-032: CopyToast component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ── Visibility ─────────────────────────────────────────────────────────────

  it('renders nothing when visible=false', () => {
    const { container } = render(
      <CopyToast visible={false} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('copy-toast')).toBeNull();
  });

  it('renders the toast when visible=true (AC-5)', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    expect(screen.getByTestId('copy-toast')).toBeDefined();
  });

  // ── Message content ────────────────────────────────────────────────────────

  it('displays the provided message text (AC-5)', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    expect(screen.getByTestId('copy-toast-message').textContent).toBe('Copied to clipboard');
  });

  it('displays a custom message when provided', () => {
    render(
      <CopyToast visible={true} message="Redacted text copied!" onDismiss={vi.fn()} />
    );

    expect(screen.getByTestId('copy-toast-message').textContent).toBe('Redacted text copied!');
  });

  // ── Animation class ────────────────────────────────────────────────────────

  it('applies animate-slide-up-spring class when visible=true (AC-5)', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    const toast = screen.getByTestId('copy-toast');
    expect(toast.className).toContain('animate-slide-up-spring');
  });

  it('does not render when visible=false (no animation class either)', () => {
    render(
      <CopyToast visible={false} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    expect(screen.queryByTestId('copy-toast')).toBeNull();
  });

  // ── Dark mode styling ──────────────────────────────────────────────────────

  it('has dark mode Tailwind classes for appropriate contrast (AC-6)', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    const toast = screen.getByTestId('copy-toast');
    expect(toast.className).toContain('dark:bg-gray-100');
    expect(toast.className).toContain('dark:text-gray-900');
  });

  // ── Auto-dismiss callback ──────────────────────────────────────────────────

  it('calls onDismiss after 2 seconds (AC-5)', () => {
    const onDismiss = vi.fn();
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={onDismiss} />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does NOT call onDismiss when visible=false', () => {
    const onDismiss = vi.fn();
    render(
      <CopyToast visible={false} message="Copied to clipboard" onDismiss={onDismiss} />
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ── Timer cleanup on unmount ───────────────────────────────────────────────

  it('clears the auto-dismiss timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={onDismiss} />
    );

    // Unmount before the timer fires
    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ── Timer resets when visible toggles ─────────────────────────────────────

  it('resets the auto-dismiss timer when visible changes from false to true', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <CopyToast visible={false} message="Copied to clipboard" onDismiss={onDismiss} />
    );

    // Make visible=true
    rerender(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={onDismiss} />
    );

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // ── Positioning / layout ───────────────────────────────────────────────────

  it('uses fixed positioning to prevent layout shift', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    const toast = screen.getByTestId('copy-toast');
    expect(toast.className).toContain('fixed');
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it('has role="status" for screen reader announcements', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    expect(screen.getByRole('status')).toBeDefined();
  });

  it('has aria-live="polite" attribute', () => {
    render(
      <CopyToast visible={true} message="Copied to clipboard" onDismiss={vi.fn()} />
    );

    const toast = screen.getByTestId('copy-toast');
    expect(toast.getAttribute('aria-live')).toBe('polite');
  });
});
