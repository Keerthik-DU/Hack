import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusIndicators } from '../StatusIndicators';
import * as useModelStatusModule from '@/hooks/useModelStatus';
import {
  createMockModelStatus,
  createMockWebGPUUnavailableStatus,
} from '@/hooks/__mocks__/useModelStatus';

describe('WO-043: StatusIndicators component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Full capability mode ─────────────────────────────────────────────────

  it('renders three CapabilityCard items in full capability mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ regex: 'ready', entropy: 'ready', llm: 'ready' })
    );

    render(<StatusIndicators />);

    expect(screen.getByTestId('capability-card-regex')).toBeDefined();
    expect(screen.getByTestId('capability-card-entropy')).toBeDefined();
    expect(screen.getByTestId('capability-card-llm')).toBeDefined();
  });

  it('shows green checkmarks for all three layers when fully capable', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ regex: 'ready', entropy: 'ready', llm: 'ready' })
    );

    render(<StatusIndicators />);

    expect(screen.getByTestId('capability-icon-ok-regex')).toBeDefined();
    expect(screen.getByTestId('capability-icon-ok-entropy')).toBeDefined();
    expect(screen.getByTestId('capability-icon-ok-llm')).toBeDefined();
  });

  it('does not show "Unavailable" labels in full capability mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus({ regex: 'ready', entropy: 'ready', llm: 'ready' })
    );

    render(<StatusIndicators />);

    expect(screen.queryByTestId('capability-unavailable-label-regex')).toBeNull();
    expect(screen.queryByTestId('capability-unavailable-label-entropy')).toBeNull();
    expect(screen.queryByTestId('capability-unavailable-label-llm')).toBeNull();
  });

  // ─── Degraded mode (LLM unavailable) ─────────────────────────────────────

  it('shows green checkmarks for Regex and Entropy in degraded mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<StatusIndicators />);

    expect(screen.getByTestId('capability-icon-ok-regex')).toBeDefined();
    expect(screen.getByTestId('capability-icon-ok-entropy')).toBeDefined();
  });

  it('shows amber warning icon for LLM in degraded mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<StatusIndicators />);

    expect(screen.getByTestId('capability-icon-unavailable-llm')).toBeDefined();
    expect(screen.queryByTestId('capability-icon-ok-llm')).toBeNull();
  });

  it('shows "Unavailable" label for LLM in degraded mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<StatusIndicators />);

    expect(screen.getByTestId('capability-unavailable-label-llm')).toBeDefined();
    expect(screen.getByTestId('capability-unavailable-label-llm').textContent).toBe('Unavailable');
  });

  it('does not show "Unavailable" labels for Regex and Entropy in degraded mode', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockWebGPUUnavailableStatus()
    );

    render(<StatusIndicators />);

    expect(screen.queryByTestId('capability-unavailable-label-regex')).toBeNull();
    expect(screen.queryByTestId('capability-unavailable-label-entropy')).toBeNull();
  });

  // ─── aria label ───────────────────────────────────────────────────────────

  it('has aria-label "Detection engine status" on the container', () => {
    vi.spyOn(useModelStatusModule, 'useModelStatus').mockReturnValue(
      createMockModelStatus()
    );

    render(<StatusIndicators />);

    const container = screen.getByTestId('status-indicators');
    expect(container.getAttribute('aria-label')).toBe('Detection engine status');
  });
});
