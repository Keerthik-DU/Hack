import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AllClearState } from './AllClearState';
import { ScanStats, formatDuration } from './ScanStats';
import { LayerChecks } from './LayerChecks';
import { CheckIcon } from './CheckIcon';
import {
  twoLayerScanScenario,
  threeLayerScanScenario,
  fastScanScenario,
  largeInputScenario,
  emptyInputScenario,
} from '@/test/fixtures/all-clear-scenarios';

// ---------------------------------------------------------------------------
// Mock the useClipboard hook so tests do not depend on the Clipboard API
// ---------------------------------------------------------------------------
vi.mock('@/hooks/useClipboard', () => ({
  useClipboard: vi.fn(),
}));

import { useClipboard } from '@/hooks/useClipboard';

const defaultClipboard = { copy: vi.fn(), copied: false, error: null };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

describe('WO-033: AllClearState component', () => {
  beforeEach(() => {
    vi.mocked(useClipboard).mockReturnValue({ ...defaultClipboard, copy: vi.fn() });
  });

  // ── Outer container ─────────────────────────────────────────────────────────

  it('renders the outer container with data-testid="all-clear-state"', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('all-clear-state')).toBeDefined();
  });

  it('has role="status" and aria-live="polite" on the outer container', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const container = screen.getByTestId('all-clear-state');
    expect(container.getAttribute('role')).toBe('status');
    expect(container.getAttribute('aria-live')).toBe('polite');
  });

  it('forwards optional className to the outer container', () => {
    render(<AllClearState {...twoLayerScanScenario} className="mt-4 custom-class" />);
    const container = screen.getByTestId('all-clear-state');
    expect(container.className).toContain('mt-4');
    expect(container.className).toContain('custom-class');
  });

  // ── CheckIcon (AC-1) ────────────────────────────────────────────────────────

  it('renders the animated checkmark icon (AC-1)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('check-icon')).toBeDefined();
    expect(screen.getByTestId('check-icon-svg')).toBeDefined();
  });

  it('CheckIcon uses motion-safe: animation prefix for bounce animation (AC-1, AC-6)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const icon = screen.getByTestId('check-icon');
    expect(icon.className).toContain('motion-safe:animate-check-bounce');
  });

  // ── Title (AC-2) ────────────────────────────────────────────────────────────

  it('renders the title "No secrets detected — safe to share" (AC-2)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const title = screen.getByTestId('all-clear-title');
    expect(title.textContent).toBe('No secrets detected — safe to share');
  });

  it('title uses motion-safe: animation prefix for letter-spacing reveal (AC-2, AC-6)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const title = screen.getByTestId('all-clear-title');
    expect(title.className).toContain('motion-safe:animate-title-reveal');
  });

  // ── Description ─────────────────────────────────────────────────────────────

  it('renders the description paragraph', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('all-clear-description')).toBeDefined();
  });

  it('description uses motion-safe: animation prefix for fade-up (AC-6)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const desc = screen.getByTestId('all-clear-description');
    expect(desc.className).toContain('motion-safe:animate-desc-fade-up');
  });

  // ── ScanStats (AC-3) ────────────────────────────────────────────────────────

  it('renders the scan-stats container (AC-3)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('scan-stats')).toBeDefined();
  });

  it('displays 0 for findings count (AC-3)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('stat-findings-value').textContent).toBe('0');
  });

  it('displays character count with locale separators for large numbers (AC-3)', () => {
    render(<AllClearState {...largeInputScenario} />);
    const charValue = screen.getByTestId('stat-characters-value').textContent ?? '';
    // 100,000 formatted with locale — contains at least '100' and '000'
    expect(charValue).toContain('100');
    expect(charValue.length).toBeGreaterThan(5); // more than plain '100000'
  });

  it('displays line count for a standard scan (AC-3)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('stat-lines-value').textContent).toBe('2');
  });

  it('displays "< 0.1s" for scan durations less than 100ms (AC-3)', () => {
    render(<AllClearState {...fastScanScenario} />);
    expect(screen.getByTestId('stat-duration-value').textContent).toBe('< 0.1s');
  });

  it('displays formatted duration in seconds for scans >= 100ms (AC-3)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    // twoLayerScanScenario has 423ms → '0.4s'
    expect(screen.getByTestId('stat-duration-value').textContent).toBe('0.4s');
  });

  it('stat cards use motion-safe: animation prefix for pop-in (AC-3, AC-6)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const findingsStat = screen.getByTestId('stat-findings');
    expect(findingsStat.className).toContain('motion-safe:animate-stat-pop-in');
  });

  // ── LayerChecks (AC-4) ──────────────────────────────────────────────────────

  it('renders Regex and Entropy layer checks always (AC-4)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const regexBadge = screen.getByTestId('layer-regex');
    const entropyBadge = screen.getByTestId('layer-entropy');
    expect(regexBadge).toBeDefined();
    expect(entropyBadge).toBeDefined();
  });

  it('layer badges show "Layer ✓" format — Regex ✓ and Entropy ✓ (AC-4)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('layer-regex').textContent).toContain('Regex');
    expect(screen.getByTestId('layer-regex').textContent).toContain('✓');
    expect(screen.getByTestId('layer-entropy').textContent).toContain('Entropy');
    expect(screen.getByTestId('layer-entropy').textContent).toContain('✓');
  });

  it('does NOT render LLM layer check when llm is not in layersCompleted (AC-4)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    // twoLayerScanScenario has only regex + entropy
    expect(screen.queryByTestId('layer-llm')).toBeNull();
  });

  it('renders LLM layer check when llm IS in layersCompleted (AC-4)', () => {
    render(<AllClearState {...threeLayerScanScenario} />);
    const llmBadge = screen.getByTestId('layer-llm');
    expect(llmBadge).toBeDefined();
    expect(llmBadge.textContent).toContain('LLM');
    expect(llmBadge.textContent).toContain('✓');
  });

  it('layer badges use motion-safe: animation prefix for slide-up (AC-4, AC-6)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    const regexBadge = screen.getByTestId('layer-regex');
    expect(regexBadge.className).toContain('motion-safe:animate-badge-slide-up');
  });

  // ── Copy Original button (AC-5) ─────────────────────────────────────────────

  it('renders the Copy Original button (AC-5)', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.getByTestId('copy-original-button')).toBeDefined();
    expect(screen.getByTestId('copy-original-button-label').textContent).toBe('Copy Original');
  });

  it('calls useClipboard.copy with originalText when button is clicked (AC-5)', () => {
    const mockCopy = vi.fn();
    vi.mocked(useClipboard).mockReturnValue({ copy: mockCopy, copied: false, error: null });

    render(<AllClearState {...twoLayerScanScenario} />);
    fireEvent.click(screen.getByTestId('copy-original-button'));

    expect(mockCopy).toHaveBeenCalledOnce();
    expect(mockCopy).toHaveBeenCalledWith(twoLayerScanScenario.originalText);
  });

  it('copies empty string without error when originalText is empty (AC-5)', () => {
    const mockCopy = vi.fn();
    vi.mocked(useClipboard).mockReturnValue({ copy: mockCopy, copied: false, error: null });

    render(<AllClearState {...emptyInputScenario} />);
    fireEvent.click(screen.getByTestId('copy-original-button'));

    expect(mockCopy).toHaveBeenCalledWith('');
  });

  it('shows "Copied!" label and success toast when copied state is true (AC-5)', () => {
    vi.mocked(useClipboard).mockReturnValue({ copy: vi.fn(), copied: true, error: null });

    render(<AllClearState {...twoLayerScanScenario} />);

    expect(screen.getByTestId('copy-original-button-label').textContent).toBe('Copied!');
    const toast = screen.getByTestId('copy-original-toast');
    expect(toast).toBeDefined();
    expect(toast.textContent).toContain('Original text copied to clipboard');
  });

  it('does not show the success toast when copied state is false', () => {
    vi.mocked(useClipboard).mockReturnValue({ copy: vi.fn(), copied: false, error: null });

    render(<AllClearState {...twoLayerScanScenario} />);

    expect(screen.queryByTestId('copy-original-toast')).toBeNull();
  });

  it('shows error feedback when useClipboard returns an error', () => {
    vi.mocked(useClipboard).mockReturnValue({
      copy: vi.fn(),
      copied: false,
      error: 'Clipboard API not available in this environment',
    });

    render(<AllClearState {...twoLayerScanScenario} />);

    const errorEl = screen.getByTestId('copy-original-error');
    expect(errorEl).toBeDefined();
    expect(errorEl.textContent).toContain('Clipboard API not available');
  });

  it('does not show error element when error is null', () => {
    render(<AllClearState {...twoLayerScanScenario} />);
    expect(screen.queryByTestId('copy-original-error')).toBeNull();
  });

  // ── prefers-reduced-motion (AC-6) ────────────────────────────────────────────

  it('all animation classes use motion-safe: prefix (AC-6)', () => {
    // Mock matchMedia to prefer reduced motion — the component itself uses CSS-only
    // motion-safe: class prefixes, so this test verifies the correct approach is used.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<AllClearState {...twoLayerScanScenario} />);

    // Check-icon: motion-safe prefix on bounce animation
    expect(screen.getByTestId('check-icon').className).toContain('motion-safe:');

    // Title: motion-safe prefix on title-reveal animation
    expect(screen.getByTestId('all-clear-title').className).toContain('motion-safe:');

    // Description: motion-safe prefix on fade-up animation
    expect(screen.getByTestId('all-clear-description').className).toContain('motion-safe:');

    // Stat cards: motion-safe prefix on pop-in animation
    expect(screen.getByTestId('stat-findings').className).toContain('motion-safe:');

    // Layer badges: motion-safe prefix on slide-up animation
    expect(screen.getByTestId('layer-regex').className).toContain('motion-safe:');
  });

  // ── Sub-component: formatDuration ───────────────────────────────────────────

  describe('formatDuration', () => {
    it('returns "< 0.1s" for 0ms', () => {
      expect(formatDuration(0)).toBe('< 0.1s');
    });

    it('returns "< 0.1s" for durations less than 100ms', () => {
      expect(formatDuration(42)).toBe('< 0.1s');
      expect(formatDuration(99)).toBe('< 0.1s');
    });

    it('returns "0.1s" for exactly 100ms', () => {
      expect(formatDuration(100)).toBe('0.1s');
    });

    it('returns "0.5s" for 500ms', () => {
      expect(formatDuration(500)).toBe('0.5s');
    });

    it('returns "1.2s" for 1200ms', () => {
      expect(formatDuration(1200)).toBe('1.2s');
    });

    it('returns "3.5s" for 3521ms', () => {
      expect(formatDuration(3521)).toBe('3.5s');
    });
  });

  // ── Sub-component: CheckIcon ─────────────────────────────────────────────────

  describe('CheckIcon', () => {
    it('renders an SVG with a circle and polyline (checkmark inside circle)', () => {
      render(<CheckIcon />);
      const svg = screen.getByTestId('check-icon-svg');
      expect(svg).toBeDefined();
      expect(svg.querySelector('circle')).not.toBeNull();
      expect(svg.querySelector('polyline')).not.toBeNull();
    });

    it('has aria-hidden="true" on the SVG for screen reader accessibility', () => {
      render(<CheckIcon />);
      const svg = screen.getByTestId('check-icon-svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  // ── Sub-component: LayerChecks ───────────────────────────────────────────────

  describe('LayerChecks', () => {
    it('renders only regex and entropy badges when LLM is absent', () => {
      render(<LayerChecks layersCompleted={['regex', 'entropy']} />);
      expect(screen.getByTestId('layer-regex')).toBeDefined();
      expect(screen.getByTestId('layer-entropy')).toBeDefined();
      expect(screen.queryByTestId('layer-llm')).toBeNull();
    });

    it('renders all three badges when all layers completed', () => {
      render(<LayerChecks layersCompleted={['regex', 'entropy', 'llm']} />);
      expect(screen.getByTestId('layer-regex')).toBeDefined();
      expect(screen.getByTestId('layer-entropy')).toBeDefined();
      expect(screen.getByTestId('layer-llm')).toBeDefined();
    });

    it('renders no badges when layersCompleted is empty', () => {
      render(<LayerChecks layersCompleted={[]} />);
      expect(screen.queryByTestId('layer-regex')).toBeNull();
      expect(screen.queryByTestId('layer-entropy')).toBeNull();
      expect(screen.queryByTestId('layer-llm')).toBeNull();
    });
  });

  // ── Sub-component: ScanStats ─────────────────────────────────────────────────

  describe('ScanStats', () => {
    it('renders all four stat cards', () => {
      render(
        <ScanStats
          scanStats={{ findingsCount: 0, charactersScanned: 100, linesScanned: 5, scanDurationMs: 250 }}
        />
      );
      expect(screen.getByTestId('stat-findings')).toBeDefined();
      expect(screen.getByTestId('stat-characters')).toBeDefined();
      expect(screen.getByTestId('stat-lines')).toBeDefined();
      expect(screen.getByTestId('stat-duration')).toBeDefined();
    });

    it('formats large character/line counts with locale separators', () => {
      render(
        <ScanStats
          scanStats={{ findingsCount: 0, charactersScanned: 100000, linesScanned: 5000, scanDurationMs: 3521 }}
        />
      );
      const charValue = screen.getByTestId('stat-characters-value').textContent ?? '';
      const lineValue = screen.getByTestId('stat-lines-value').textContent ?? '';
      // Locale-formatted numbers are longer than plain integers
      expect(charValue.length).toBeGreaterThan(6);
      expect(lineValue.length).toBeGreaterThan(4);
    });
  });

  // ── Snapshot regression tests ─────────────────────────────────────────────────

  it('snapshot: 2-layer scan (regex + entropy, no LLM)', () => {
    const { container } = render(<AllClearState {...twoLayerScanScenario} />);
    expect(container).toMatchSnapshot();
  });

  it('snapshot: 3-layer scan (regex + entropy + LLM)', () => {
    const { container } = render(<AllClearState {...threeLayerScanScenario} />);
    expect(container).toMatchSnapshot();
  });
});
