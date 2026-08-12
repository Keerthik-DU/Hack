import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetectionLayerBoundary } from './DetectionLayerBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('Render boom in LLM section');
  }
  return <div data-testid="layer-child-ok">ok</div>;
}

describe('WO-044: DetectionLayerBoundary', () => {
  it('catches render errors and shows fallback with layer name and retry', () => {
    const onRetry = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <DetectionLayerBoundary layer="llm" onRetry={onRetry}>
        <ThrowingChild shouldThrow />
      </DetectionLayerBoundary>
    );

    expect(screen.getByTestId('detection-layer-boundary-fallback-llm')).toBeTruthy();
    expect(screen.getByText(/LLM layer failed/i)).toBeTruthy();
    expect(screen.getByText(/Render boom in LLM section/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('detection-layer-retry-llm'));
    expect(onRetry).toHaveBeenCalledWith('llm');

    spy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <DetectionLayerBoundary layer="regex">
        <ThrowingChild shouldThrow={false} />
      </DetectionLayerBoundary>
    );
    expect(screen.getByTestId('layer-child-ok')).toBeTruthy();
  });
});
