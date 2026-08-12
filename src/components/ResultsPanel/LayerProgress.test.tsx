import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LayerProgress } from './LayerProgress';
import { LayerStatusMap } from '@/types';

const allComplete: LayerStatusMap = {
  regex: 'complete',
  entropy: 'complete',
  llm: 'complete',
};

describe('WO-029: LayerProgress', () => {
  it('renders checkmark icons for completed layers', () => {
    render(<LayerProgress layerStatuses={allComplete} />);
    expect(screen.getAllByTestId('layer-icon-complete')).toHaveLength(3);
    expect(screen.getByTestId('layer-progress-regex').getAttribute('data-status')).toBe(
      'complete'
    );
  });

  it('renders spinner for in-progress layers', () => {
    render(
      <LayerProgress
        layerStatuses={{ regex: 'complete', entropy: 'running', llm: 'pending' }}
      />
    );
    expect(screen.getByTestId('layer-icon-running')).toBeDefined();
    expect(screen.getByTestId('layer-progress-entropy').getAttribute('data-status')).toBe(
      'running'
    );
    expect(screen.getByTestId('layer-icon-pending')).toBeDefined();
  });

  it('renders warning icon for unavailable layers', () => {
    render(
      <LayerProgress
        layerStatuses={{ regex: 'complete', entropy: 'complete', llm: 'unavailable' }}
      />
    );
    expect(screen.getByTestId('layer-icon-unavailable')).toBeDefined();
    expect(screen.getByTestId('layer-progress-llm').getAttribute('data-status')).toBe(
      'unavailable'
    );
  });

  it('exposes an ARIA live region announcing layer status', () => {
    render(<LayerProgress layerStatuses={allComplete} />);
    const live = screen.getByTestId('layer-progress-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('Regex complete');
    expect(live.textContent).toContain('LLM complete');
  });
});
