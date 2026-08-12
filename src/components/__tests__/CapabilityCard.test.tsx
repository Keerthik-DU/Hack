import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CapabilityCard } from '../CapabilityCard';

describe('WO-043: CapabilityCard component', () => {
  // ─── status=ok ────────────────────────────────────────────────────────────

  it('renders a green checkmark icon when status is ok', () => {
    render(<CapabilityCard layer="Regex" status="ok" />);

    expect(screen.getByTestId('capability-icon-ok-regex')).toBeDefined();
    expect(screen.queryByTestId('capability-icon-unavailable-regex')).toBeNull();
  });

  it('does not render "Unavailable" label when status is ok', () => {
    render(<CapabilityCard layer="Entropy" status="ok" />);

    expect(screen.queryByTestId('capability-unavailable-label-entropy')).toBeNull();
  });

  it('renders the layer name when status is ok', () => {
    render(<CapabilityCard layer="Regex" status="ok" />);

    expect(screen.getByText('Regex')).toBeDefined();
  });

  // ─── status=unavailable ───────────────────────────────────────────────────

  it('renders an amber warning icon when status is unavailable', () => {
    render(<CapabilityCard layer="LLM" status="unavailable" />);

    expect(screen.getByTestId('capability-icon-unavailable-llm')).toBeDefined();
    expect(screen.queryByTestId('capability-icon-ok-llm')).toBeNull();
  });

  it('renders "Unavailable" label when status is unavailable', () => {
    render(<CapabilityCard layer="LLM" status="unavailable" />);

    expect(screen.getByTestId('capability-unavailable-label-llm')).toBeDefined();
    expect(screen.getByTestId('capability-unavailable-label-llm').textContent).toBe('Unavailable');
  });

  it('renders the layer name when status is unavailable', () => {
    render(<CapabilityCard layer="LLM" status="unavailable" />);

    expect(screen.getByText('LLM')).toBeDefined();
  });

  // ─── data-testid attributes ───────────────────────────────────────────────

  it('sets data-testid based on lowercased layer name', () => {
    render(<CapabilityCard layer="Entropy" status="ok" />);

    expect(screen.getByTestId('capability-card-entropy')).toBeDefined();
  });

  it('sets data-testid based on lowercased layer name for unavailable', () => {
    render(<CapabilityCard layer="LLM" status="unavailable" />);

    expect(screen.getByTestId('capability-card-llm')).toBeDefined();
  });

  // ─── reason prop ──────────────────────────────────────────────────────────

  it('includes reason in the title attribute when provided', () => {
    render(
      <CapabilityCard
        layer="LLM"
        status="unavailable"
        reason="WebGPU API not available in this browser"
      />
    );

    const card = screen.getByTestId('capability-card-llm');
    expect(card.getAttribute('title')).toContain('WebGPU API not available in this browser');
  });

  it('falls back to layer:status title when no reason is provided', () => {
    render(<CapabilityCard layer="LLM" status="unavailable" />);

    const card = screen.getByTestId('capability-card-llm');
    expect(card.getAttribute('title')).toBe('LLM: unavailable');
  });
});
