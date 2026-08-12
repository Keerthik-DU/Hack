import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VerdictBanner } from './VerdictBanner';
import {
  verdictZeroFindings,
  verdictOneFinding,
  verdictFiveFindings,
  verdictSixFindings,
  verdictTwentyFindings,
} from '@/test/fixtures/findings';

describe('WO-030: VerdictBanner component', () => {
  // ─── idle state ──────────────────────────────────────────────────────────

  it('renders nothing (null) when scanStatus is idle with 0 findings', () => {
    const { container } = render(
      <VerdictBanner findingsCount={0} scanStatus="idle" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing (null) when scanStatus is idle with non-zero findings', () => {
    const { container } = render(
      <VerdictBanner findingsCount={3} scanStatus="idle" />
    );

    expect(container.firstChild).toBeNull();
  });

  // ─── scanning state ───────────────────────────────────────────────────────

  it('renders neutral scanning banner when scanStatus is scanning', () => {
    render(<VerdictBanner findingsCount={0} scanStatus="scanning" />);

    const banner = screen.getByTestId('verdict-banner-scanning');
    expect(banner).toBeDefined();
    expect(screen.getByText('Scanning…')).toBeDefined();
    expect(screen.getByTestId('verdict-icon-scanning')).toBeDefined();
  });

  it('does NOT show verdict-banner when scanning is in progress', () => {
    render(<VerdictBanner findingsCount={0} scanStatus="scanning" />);

    expect(screen.queryByTestId('verdict-banner')).toBeNull();
    expect(screen.queryByTestId('verdict-text')).toBeNull();
  });

  // ─── complete + zero findings ────────────────────────────────────────────

  it('renders green safe banner when complete with 0 findings', () => {
    render(
      <VerdictBanner
        findingsCount={verdictZeroFindings.count}
        scanStatus={verdictZeroFindings.scanStatus}
      />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner).toBeDefined();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.className).toContain('green');
    expect(screen.getByTestId('verdict-icon-safe')).toBeDefined();
    expect(screen.getByTestId('verdict-text').textContent).toBe(
      'No secrets detected — safe to share'
    );
  });

  it('applies correct Tailwind green classes for the safe state', () => {
    render(<VerdictBanner findingsCount={0} scanStatus="complete" />);

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('bg-green-50');
    expect(banner.className).toContain('dark:bg-green-950');
    expect(banner.className).toContain('border-l-4');
    expect(banner.className).toContain('border-green-500');
  });

  // ─── complete + 1 finding (amber warning) ────────────────────────────────

  it('renders amber warning banner when complete with 1 finding', () => {
    render(
      <VerdictBanner
        findingsCount={verdictOneFinding.count}
        scanStatus={verdictOneFinding.scanStatus}
      />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('amber');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('verdict-icon-warning')).toBeDefined();
    expect(screen.getByTestId('verdict-text').textContent).toBe(
      '1 potential secret found — review before sharing'
    );
  });

  // ─── complete + 5 findings (amber warning boundary) ─────────────────────

  it('renders amber warning banner when complete with 5 findings', () => {
    render(
      <VerdictBanner
        findingsCount={verdictFiveFindings.count}
        scanStatus={verdictFiveFindings.scanStatus}
      />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('amber');
    expect(screen.getByTestId('verdict-text').textContent).toBe(
      '5 potential secrets found — review before sharing'
    );
  });

  it('applies correct Tailwind amber classes for the warning state', () => {
    render(<VerdictBanner findingsCount={3} scanStatus="complete" />);

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('bg-amber-50');
    expect(banner.className).toContain('dark:bg-amber-950');
    expect(banner.className).toContain('border-l-4');
    expect(banner.className).toContain('border-amber-500');
  });

  // ─── complete + 6 findings (red danger boundary) ─────────────────────────

  it('renders red danger banner when complete with 6 findings', () => {
    render(
      <VerdictBanner
        findingsCount={verdictSixFindings.count}
        scanStatus={verdictSixFindings.scanStatus}
      />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('red');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('verdict-icon-danger')).toBeDefined();
    expect(screen.getByTestId('verdict-text').textContent).toBe(
      '6 potential secrets found — review before sharing'
    );
  });

  // ─── complete + 20 findings (red danger) ─────────────────────────────────

  it('renders red danger banner when complete with 20 findings', () => {
    render(
      <VerdictBanner
        findingsCount={verdictTwentyFindings.count}
        scanStatus={verdictTwentyFindings.scanStatus}
      />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('red');
    expect(screen.getByTestId('verdict-text').textContent).toBe(
      '20 potential secrets found — review before sharing'
    );
  });

  it('renders red danger banner with 100+ findings without layout overflow', () => {
    render(<VerdictBanner findingsCount={100} scanStatus="complete" />);

    expect(screen.getByTestId('verdict-text').textContent).toBe(
      '100 potential secrets found — review before sharing'
    );
  });

  it('applies correct Tailwind red classes for the danger state', () => {
    render(<VerdictBanner findingsCount={10} scanStatus="complete" />);

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('bg-red-50');
    expect(banner.className).toContain('dark:bg-red-950');
    expect(banner.className).toContain('border-l-4');
    expect(banner.className).toContain('border-red-500');
  });

  // ─── ARIA attributes ──────────────────────────────────────────────────────

  it('has role=alert on the complete safe banner', () => {
    render(<VerdictBanner findingsCount={0} scanStatus="complete" />);

    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has role=alert on the complete warning banner', () => {
    render(<VerdictBanner findingsCount={3} scanStatus="complete" />);

    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('has role=alert on the complete danger banner', () => {
    render(<VerdictBanner findingsCount={10} scanStatus="complete" />);

    expect(screen.getByRole('alert')).toBeDefined();
  });

  // ─── CSS transition ───────────────────────────────────────────────────────

  it('applies transition-colors duration-300 for smooth background changes', () => {
    render(<VerdictBanner findingsCount={0} scanStatus="complete" />);

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('transition-colors');
    expect(banner.className).toContain('duration-300');
  });

  // ─── className passthrough ────────────────────────────────────────────────

  it('forwards optional className prop to the banner container', () => {
    render(
      <VerdictBanner findingsCount={0} scanStatus="complete" className="mt-4 custom-class" />
    );

    const banner = screen.getByTestId('verdict-banner');
    expect(banner.className).toContain('mt-4');
    expect(banner.className).toContain('custom-class');
  });

  // ─── snapshot regression baselines ───────────────────────────────────────

  it('snapshot: idle state renders empty container', () => {
    const { container } = render(<VerdictBanner findingsCount={0} scanStatus="idle" />);

    expect(container).toMatchSnapshot();
  });

  it('snapshot: scanning state neutral banner', () => {
    const { container } = render(<VerdictBanner findingsCount={0} scanStatus="scanning" />);

    expect(container).toMatchSnapshot();
  });

  it('snapshot: complete zero findings safe (green) banner', () => {
    const { container } = render(<VerdictBanner findingsCount={0} scanStatus="complete" />);

    expect(container).toMatchSnapshot();
  });

  it('snapshot: complete five findings amber warning banner', () => {
    const { container } = render(<VerdictBanner findingsCount={5} scanStatus="complete" />);

    expect(container).toMatchSnapshot();
  });

  it('snapshot: complete six findings red danger banner', () => {
    const { container } = render(<VerdictBanner findingsCount={6} scanStatus="complete" />);

    expect(container).toMatchSnapshot();
  });
});
