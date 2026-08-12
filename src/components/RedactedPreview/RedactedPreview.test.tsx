import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedactedPreview } from './RedactedPreview';
import { Finding, SecretType } from '@/types';

// ---------------------------------------------------------------------------
// Mock the useClipboard hook so tests do not depend on Clipboard API
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useClipboard', () => ({
  useClipboard: vi.fn(),
}));

import { useClipboard } from '@/hooks/useClipboard';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFinding(
  id: string,
  secretType: SecretType,
  lineNumber: number,
  columnStart: number,
  columnEnd: number
): Finding {
  return {
    id,
    secretType,
    lineNumber,
    columnStart,
    columnEnd,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: '***',
    context: '',
  };
}

const defaultMockClipboard = {
  copy: vi.fn(),
  copied: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('WO-031: RedactedPreview component', () => {
  beforeEach(() => {
    vi.mocked(useClipboard).mockReturnValue({ ...defaultMockClipboard, copy: vi.fn() });
  });

  // ── Rendering with no findings ─────────────────────────────────────────────

  it('renders the original text unchanged when there are no findings', () => {
    render(<RedactedPreview originalText="no secrets here" findings={[]} />);

    const textBlock = screen.getByTestId('redacted-preview-text');
    expect(textBlock.textContent).toBe('no secrets here');
    expect(screen.queryByTestId('redacted-placeholder')).toBeNull();
  });

  it('renders the outer container with data-testid="redacted-preview"', () => {
    render(<RedactedPreview originalText="text" findings={[]} />);
    expect(screen.getByTestId('redacted-preview')).toBeDefined();
  });

  // ── Placeholder rendering ──────────────────────────────────────────────────

  it('renders a placeholder span for each detected secret', () => {
    const text = 'api_key=AKIAIOSFODNN7EXAMPLE end';
    // AKIAIOSFODNN7EXAMPLE → cols 8-27, 20 chars
    const findings = [makeFinding('f1', 'aws_access_key', 1, 8, 28)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholders = screen.getAllByTestId('redacted-placeholder');
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0].textContent).toBe('[REDACTED-AWS_ACCESS_KEY]');
  });

  it('renders multiple placeholder spans for multiple findings', () => {
    const text = 'key=AKIAIOSFODNN7EXAMPLE token=ghp_abcdef1234\n';
    const findings = [
      makeFinding('f1', 'aws_access_key', 1, 4, 24),
      makeFinding('f2', 'token', 1, 31, 45),
    ];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholders = screen.getAllByTestId('redacted-placeholder');
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0].textContent).toBe('[REDACTED-AWS_ACCESS_KEY]');
    expect(placeholders[1].textContent).toBe('[REDACTED-TOKEN]');
  });

  it('renders non-placeholder text segments as plain text', () => {
    const text = 'api_key=AKIAIOSFODNN7EXAMPLE end';
    const findings = [makeFinding('f1', 'aws_access_key', 1, 8, 28)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const textBlock = screen.getByTestId('redacted-preview-text');
    expect(textBlock.textContent).toContain('api_key=');
    expect(textBlock.textContent).toContain(' end');
    expect(textBlock.textContent).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  // ── Amber highlight styling ────────────────────────────────────────────────

  it('applies amber highlight background classes to placeholder spans (AC-2)', () => {
    const text = 'token=SECRET_VALUE rest';
    const findings = [makeFinding('f1', 'token', 1, 6, 18)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholder = screen.getByTestId('redacted-placeholder');
    expect(placeholder.className).toContain('bg-amber-200');
    expect(placeholder.className).toContain('dark:bg-amber-800');
  });

  it('does not use dangerouslySetInnerHTML — placeholders are React span elements', () => {
    const text = 'key=SECRET';
    const findings = [makeFinding('f1', 'token', 1, 4, 10)];

    const { container } = render(<RedactedPreview originalText={text} findings={findings} />);

    // Verify span elements exist (not injected HTML)
    const spans = container.querySelectorAll('[data-testid="redacted-placeholder"]');
    expect(spans.length).toBeGreaterThan(0);
    spans.forEach((span) => {
      expect(span.tagName.toLowerCase()).toBe('span');
    });
  });

  // ── Monospace font (AC-3) ──────────────────────────────────────────────────

  it('renders the text block in a monospace <pre> element (AC-3)', () => {
    render(<RedactedPreview originalText="code = SECRET" findings={[]} />);

    const preBlock = screen.getByTestId('redacted-preview-text');
    expect(preBlock.tagName.toLowerCase()).toBe('pre');
    expect(preBlock.className).toContain('font-mono');
  });

  it('preserves whitespace with whitespace-pre-wrap class', () => {
    render(<RedactedPreview originalText="line 1\n  indented" findings={[]} />);

    const preBlock = screen.getByTestId('redacted-preview-text');
    expect(preBlock.className).toContain('whitespace-pre-wrap');
  });

  // ── Copy button (AC-4) ────────────────────────────────────────────────────

  it('renders a Copy Redacted Text button', () => {
    render(<RedactedPreview originalText="text" findings={[]} />);

    const button = screen.getByTestId('copy-redacted-button');
    expect(button).toBeDefined();
    expect(screen.getByTestId('copy-button-label').textContent).toBe('Copy Redacted Text');
  });

  it('calls useClipboard.copy with the plain-text redacted string when button is clicked (AC-4)', () => {
    const mockCopy = vi.fn();
    vi.mocked(useClipboard).mockReturnValue({ copy: mockCopy, copied: false, error: null });

    const text = 'api_key=AKIAIOSFODNN7EXAMPLE end';
    const findings = [makeFinding('f1', 'aws_access_key', 1, 8, 28)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    fireEvent.click(screen.getByTestId('copy-redacted-button'));

    expect(mockCopy).toHaveBeenCalledOnce();
    expect(mockCopy).toHaveBeenCalledWith('api_key=[REDACTED-AWS_ACCESS_KEY] end');
  });

  it('passes plain text to copy — not HTML markup (AC-4 constraint)', () => {
    const mockCopy = vi.fn();
    vi.mocked(useClipboard).mockReturnValue({ copy: mockCopy, copied: false, error: null });

    const text = 'secret=TOKEN_VALUE';
    const findings = [makeFinding('f1', 'token', 1, 7, 18)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    fireEvent.click(screen.getByTestId('copy-redacted-button'));

    const copiedText = mockCopy.mock.calls[0][0] as string;
    // Must not contain any HTML tags
    expect(copiedText).not.toMatch(/<[^>]+>/);
    expect(copiedText).toBe('secret=[REDACTED-TOKEN]');
  });

  // ── Copied state / success toast (AC-4) ───────────────────────────────────

  it('shows "Copied!" label and success toast when copied state is true', () => {
    vi.mocked(useClipboard).mockReturnValue({
      copy: vi.fn(),
      copied: true,
      error: null,
    });

    render(<RedactedPreview originalText="text" findings={[]} />);

    expect(screen.getByTestId('copy-button-label').textContent).toBe('Copied!');
    expect(screen.getByTestId('copy-success-toast')).toBeDefined();
    expect(screen.getByTestId('copy-success-toast').textContent).toContain(
      'Redacted text copied to clipboard'
    );
  });

  it('shows "Copy Redacted Text" label when copied state is false', () => {
    vi.mocked(useClipboard).mockReturnValue({
      copy: vi.fn(),
      copied: false,
      error: null,
    });

    render(<RedactedPreview originalText="text" findings={[]} />);

    expect(screen.getByTestId('copy-button-label').textContent).toBe('Copy Redacted Text');
    expect(screen.queryByTestId('copy-success-toast')).toBeNull();
  });

  // ── Error feedback ────────────────────────────────────────────────────────

  it('displays error message when useClipboard returns an error', () => {
    vi.mocked(useClipboard).mockReturnValue({
      copy: vi.fn(),
      copied: false,
      error: 'Clipboard API not available in this environment',
    });

    render(<RedactedPreview originalText="text" findings={[]} />);

    const errorEl = screen.getByTestId('copy-error');
    expect(errorEl).toBeDefined();
    expect(errorEl.textContent).toContain('Clipboard API not available');
  });

  it('does not display error element when error is null', () => {
    vi.mocked(useClipboard).mockReturnValue({
      copy: vi.fn(),
      copied: false,
      error: null,
    });

    render(<RedactedPreview originalText="text" findings={[]} />);

    expect(screen.queryByTestId('copy-error')).toBeNull();
  });

  // ── className passthrough ─────────────────────────────────────────────────

  it('forwards optional className to the outer container', () => {
    render(
      <RedactedPreview originalText="text" findings={[]} className="mt-4 custom-class" />
    );

    const container = screen.getByTestId('redacted-preview');
    expect(container.className).toContain('mt-4');
    expect(container.className).toContain('custom-class');
  });

  // ── Various finding configurations ────────────────────────────────────────

  it('correctly handles overlapping findings — renders a single merged placeholder', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\n';
    const findings = [
      makeFinding('f1', 'api_key', 1, 0, 15),
      makeFinding('f2', 'token', 1, 10, 26),
    ];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholders = screen.getAllByTestId('redacted-placeholder');
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0].textContent).toBe('[REDACTED-API_KEY]');
  });

  it('correctly handles adjacent findings — renders two separate placeholders', () => {
    const text = 'ABCDEFGHIJKLMNOPQRST\n';
    const findings = [
      makeFinding('f1', 'api_key', 1, 0, 10),
      makeFinding('f2', 'token', 1, 10, 20),
    ];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholders = screen.getAllByTestId('redacted-placeholder');
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0].textContent).toBe('[REDACTED-API_KEY]');
    expect(placeholders[1].textContent).toBe('[REDACTED-TOKEN]');
  });

  it('renders correctly with a finding on a non-first line', () => {
    const text = 'line one\napi_key=AKIAIOSFODNN7EXAMPLE\nline three';
    const findings = [makeFinding('f1', 'aws_access_key', 2, 8, 28)];

    render(<RedactedPreview originalText={text} findings={findings} />);

    const placeholders = screen.getAllByTestId('redacted-placeholder');
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0].textContent).toBe('[REDACTED-AWS_ACCESS_KEY]');
    // Surrounding context is preserved
    expect(screen.getByTestId('redacted-preview-text').textContent).toContain('line one');
    expect(screen.getByTestId('redacted-preview-text').textContent).toContain('line three');
  });
});
