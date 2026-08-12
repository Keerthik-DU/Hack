import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScanEngineBoundary } from './ScanEngineBoundary';

function CatastrophicChild({ blowUp }: { blowUp: boolean }): JSX.Element {
  if (blowUp) {
    throw new Error('Catastrophic results render failure');
  }
  return <div data-testid="results-ok">results</div>;
}

describe('WO-044: ScanEngineBoundary', () => {
  it('catches catastrophic errors and offers Retry Scan', () => {
    const onRetryScan = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ScanEngineBoundary onRetryScan={onRetryScan}>
        <CatastrophicChild blowUp />
      </ScanEngineBoundary>
    );

    expect(screen.getByTestId('scan-engine-boundary-fallback')).toBeTruthy();
    expect(screen.getByText(/Scan encountered an unexpected error/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('scan-engine-retry'));
    expect(onRetryScan).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  it('shows all-layers-failed messaging when flagged', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ScanEngineBoundary allLayersFailed>
        <CatastrophicChild blowUp />
      </ScanEngineBoundary>
    );

    expect(
      screen.getByText(/All detection layers encountered errors\. Please retry\./i)
    ).toBeTruthy();

    spy.mockRestore();
  });
});
