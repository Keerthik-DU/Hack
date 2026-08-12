import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusBar } from '../StatusBar';

vi.mock('@/hooks', () => ({
  useModelStatus: () => ({
    webgpuAvailable: true,
    modelState: 'ready',
    downloadProgress: 100,
    degradedMessage: null,
  }),
}));

describe('WO-054: StatusBar memory indicator', () => {
  it('shows amber warning when approaching limit', () => {
    render(<StatusBar memoryApproachingLimit />);
    const el = screen.getByTestId('memory-warning-indicator');
    expect(el.getAttribute('aria-label')).toContain('High memory usage');
  });

  it('shows critical when at ceiling', () => {
    render(<StatusBar memoryAtCeiling />);
    expect(screen.getByTestId('memory-warning-indicator').textContent).toContain('Critical');
  });
});
