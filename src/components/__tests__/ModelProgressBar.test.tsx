import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelProgressBar } from '../ModelProgressBar';

describe('ModelProgressBar', () => {
  it('renders percentage and bytes while downloading', () => {
    render(
      <ModelProgressBar
        status="downloading"
        progress={{ bytesLoaded: 245 * 1024 * 1024, totalBytes: 800 * 1024 * 1024, percent: 30 }}
        elapsedMs={10_000}
      />
    );
    expect(screen.getByTestId('model-progress-percent').textContent).toContain('30%');
    expect(screen.getByTestId('model-progress-bytes')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('30');
  });

  it('shows indeterminate state when progress is null during checking', () => {
    render(<ModelProgressBar status="checking-cache" progress={null} />);
    expect(screen.getByTestId('model-progress-percent').textContent).toContain('Working');
    expect(screen.getByRole('progressbar').getAttribute('aria-busy')).toBe('true');
  });

  it('shows success state when ready', () => {
    render(<ModelProgressBar status="ready" progress={null} />);
    expect(screen.getByTestId('model-progress-percent').textContent).toContain('Model ready');
  });
});
