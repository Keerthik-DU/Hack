import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopyButton } from './CopyButton';

// ---------------------------------------------------------------------------
// Mock the useClipboard hook
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useClipboard', () => ({
  useClipboard: vi.fn(),
}));

import { useClipboard } from '@/hooks/useClipboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultMock = {
  copy: vi.fn(),
  copied: false,
  error: null as string | null,
};

function setupMock(overrides: Partial<typeof defaultMock> = {}): void {
  vi.mocked(useClipboard).mockReturnValue({ ...defaultMock, copy: vi.fn(), ...overrides });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WO-032: CopyButton component', () => {
  beforeEach(() => {
    setupMock();
  });

  // ── Idle state ─────────────────────────────────────────────────────────────

  it('renders with default "Copy" label in idle state', () => {
    render(<CopyButton text="some text" />);

    const label = screen.getByTestId('copy-button-label');
    expect(label.textContent).toBe('Copy');
  });

  it('renders with custom label in idle state', () => {
    render(<CopyButton text="some text" label="Copy Code" />);

    const label = screen.getByTestId('copy-button-label');
    expect(label.textContent).toBe('Copy Code');
  });

  it('renders the clipboard icon in idle state', () => {
    render(<CopyButton text="some text" />);

    expect(screen.getByTestId('copy-button-icon-idle')).toBeDefined();
    expect(screen.queryByTestId('copy-button-icon-copied')).toBeNull();
    expect(screen.queryByTestId('copy-button-icon-error')).toBeNull();
  });

  it('applies indigo background classes in idle state (AC-4)', () => {
    render(<CopyButton text="some text" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.className).toContain('bg-indigo-600');
  });

  // ── Copied state ───────────────────────────────────────────────────────────

  it('renders "Copied!" label when copied=true (AC-4)', () => {
    setupMock({ copied: true });
    render(<CopyButton text="some text" />);

    const label = screen.getByTestId('copy-button-label');
    expect(label.textContent).toBe('Copied!');
  });

  it('renders the checkmark icon when copied=true (AC-4)', () => {
    setupMock({ copied: true });
    render(<CopyButton text="some text" />);

    expect(screen.getByTestId('copy-button-icon-copied')).toBeDefined();
    expect(screen.queryByTestId('copy-button-icon-idle')).toBeNull();
    expect(screen.queryByTestId('copy-button-icon-error')).toBeNull();
  });

  it('applies green background classes when copied=true', () => {
    setupMock({ copied: true });
    render(<CopyButton text="some text" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.className).toContain('bg-emerald-600');
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('renders "Failed" label when error is non-null (AC-4)', () => {
    setupMock({ error: 'Permission denied' });
    render(<CopyButton text="some text" />);

    const label = screen.getByTestId('copy-button-label');
    expect(label.textContent).toBe('Failed');
  });

  it('renders the X icon when error is non-null (AC-4)', () => {
    setupMock({ error: 'Permission denied' });
    render(<CopyButton text="some text" />);

    expect(screen.getByTestId('copy-button-icon-error')).toBeDefined();
    expect(screen.queryByTestId('copy-button-icon-idle')).toBeNull();
    expect(screen.queryByTestId('copy-button-icon-copied')).toBeNull();
  });

  it('applies red background classes when error is non-null', () => {
    setupMock({ error: 'Permission denied' });
    render(<CopyButton text="some text" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.className).toContain('bg-red-600');
  });

  // ── Click handler ──────────────────────────────────────────────────────────

  it('calls useClipboard.copy with the provided text when clicked', () => {
    const mockCopy = vi.fn();
    setupMock({ copy: mockCopy });
    render(<CopyButton text="hello world" />);

    fireEvent.click(screen.getByTestId('copy-button'));

    expect(mockCopy).toHaveBeenCalledOnce();
    expect(mockCopy).toHaveBeenCalledWith('hello world');
  });

  it('does not call copy when text is empty (still invokes with empty string)', () => {
    const mockCopy = vi.fn();
    setupMock({ copy: mockCopy });
    render(<CopyButton text="" />);

    fireEvent.click(screen.getByTestId('copy-button'));

    expect(mockCopy).toHaveBeenCalledOnce();
    expect(mockCopy).toHaveBeenCalledWith('');
  });

  // ── onCopied callback ──────────────────────────────────────────────────────

  it('calls onCopied callback when copied=true', () => {
    const onCopied = vi.fn();
    setupMock({ copied: true });
    render(<CopyButton text="some text" onCopied={onCopied} />);

    expect(onCopied).toHaveBeenCalledOnce();
  });

  it('does not call onCopied when copied=false', () => {
    const onCopied = vi.fn();
    setupMock({ copied: false });
    render(<CopyButton text="some text" onCopied={onCopied} />);

    expect(onCopied).not.toHaveBeenCalled();
  });

  it('does not throw when onCopied is not provided', () => {
    setupMock({ copied: true });
    expect(() => render(<CopyButton text="some text" />)).not.toThrow();
  });

  // ── className passthrough ──────────────────────────────────────────────────

  it('forwards optional className to the button element', () => {
    render(<CopyButton text="text" className="mt-4 custom-class" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.className).toContain('mt-4');
    expect(btn.className).toContain('custom-class');
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it('renders a button element of type="button"', () => {
    render(<CopyButton text="text" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.tagName.toLowerCase()).toBe('button');
    expect(btn.getAttribute('type')).toBe('button');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<CopyButton text="text" />);

    const btn = screen.getByTestId('copy-button');
    expect(btn.getAttribute('aria-live')).toBe('polite');
  });

  // ── Copied state takes precedence over error ───────────────────────────────

  it('shows Copied! label when both copied=true and error is non-null', () => {
    // Unlikely in practice, but verifying precedence in the UI
    setupMock({ copied: true, error: 'some error' });
    render(<CopyButton text="text" />);

    expect(screen.getByTestId('copy-button-label').textContent).toBe('Copied!');
    expect(screen.getByTestId('copy-button-icon-copied')).toBeDefined();
  });
});
