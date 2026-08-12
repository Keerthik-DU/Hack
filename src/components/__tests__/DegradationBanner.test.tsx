import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DegradationBanner } from '../DegradationBanner';
import * as useModelStatusModule from '@/hooks/useModelStatus';
import {
  createMockModelStatus,
  createMockWebGPUUnavailableStatus,
} from '@/hooks/__mocks__/useModelStatus';

describe('WO-043: DegradationBanner component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Visibility when LLM is available ────────────────────────────────────

  it('renders nothing when LLM engine status is ready (WebGPU available)', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ llm: 'ready', webgpuAvailable: true })
    );

    const { container } = render(<DegradationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when LLM engine status is loading', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ llm: 'loading', webgpuAvailable: false })
    );

    const { container } = render(<DegradationBanner />);
    expect(container.firstChild).toBeNull();
  });

  // ─── Visibility when LLM is unavailable ──────────────────────────────────

  it('renders the degradation banner when LLM status is unavailable', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    expect(screen.getByTestId('degradation-banner')).toBeDefined();
  });

  it('displays the exact required text when degraded', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    expect(screen.getByTestId('degradation-banner-text').textContent).toBe(
      'LLM-based contextual analysis is unavailable. Scanning with regex and entropy detection only.'
    );
  });

  it('renders with role=alert and aria-live=polite for accessibility', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    const banner = screen.getByTestId('degradation-banner');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('renders amber warning icon when degraded', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    expect(screen.getByTestId('degradation-banner-icon')).toBeDefined();
  });

  it('applies amber colour classes when degraded', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    const banner = screen.getByTestId('degradation-banner');
    expect(banner.className).toContain('amber');
    expect(banner.className).toContain('border-l-4');
    expect(banner.className).toContain('border-amber-500');
  });

  // ─── Dismiss behaviour ────────────────────────────────────────────────────

  it('renders dismiss button when degraded', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    expect(screen.getByTestId('degradation-banner-dismiss')).toBeDefined();
  });

  it('hides the banner after dismiss button is clicked', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    expect(screen.getByTestId('degradation-banner')).toBeDefined();

    fireEvent.click(screen.getByTestId('degradation-banner-dismiss'));

    expect(screen.queryByTestId('degradation-banner')).toBeNull();
  });

  it('keeps the banner hidden after dismiss when the hook still reports unavailable', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    fireEvent.click(screen.getByTestId('degradation-banner-dismiss'));

    // Simulate a re-render by querying again — banner should still be hidden
    expect(screen.queryByTestId('degradation-banner')).toBeNull();
    expect(screen.queryByTestId('degradation-banner-text')).toBeNull();
  });

  it('dismiss button has accessible aria-label', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner />);

    const dismissBtn = screen.getByTestId('degradation-banner-dismiss');
    expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss degradation notice');
  });

  // ─── className passthrough ────────────────────────────────────────────────

  it('forwards optional className prop to the banner container', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<DegradationBanner className="mt-4 custom-test-class" />);

    const banner = screen.getByTestId('degradation-banner');
    expect(banner.className).toContain('mt-4');
    expect(banner.className).toContain('custom-test-class');
  });
});
