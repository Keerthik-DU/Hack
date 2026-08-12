import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayerStatusList } from './LayerStatusList';
import { mixedLayerStatusFixtures } from '@/__fixtures__/mock-engines';

describe('WO-044: LayerStatusList', () => {
  it('renders correct icons for mixed ok/error states', () => {
    render(<LayerStatusList layerStatuses={mixedLayerStatusFixtures.llmFailed} />);

    expect(screen.getByTestId('layer-status-regex').getAttribute('data-status')).toBe(
      'complete'
    );
    expect(screen.getByTestId('layer-status-entropy').getAttribute('data-status')).toBe(
      'complete'
    );
    expect(screen.getByTestId('layer-status-llm').getAttribute('data-status')).toBe('error');
    expect(screen.getByTestId('layer-status-icon-error')).toBeTruthy();
  });

  it('invokes onRetryLayer for failed layers', () => {
    const onRetryLayer = vi.fn();
    render(
      <LayerStatusList
        layerStatuses={mixedLayerStatusFixtures.llmFailed}
        onRetryLayer={onRetryLayer}
      />
    );

    fireEvent.click(screen.getByTestId('layer-status-retry-llm'));
    expect(onRetryLayer).toHaveBeenCalledWith('llm');
  });
});
