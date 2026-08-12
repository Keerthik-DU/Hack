import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from '../ProgressPanel';
import { LayerProgressCard } from '../LayerProgressCard';
import { EarlyFindings } from '../EarlyFindings';
import { OverallProgress } from '../OverallProgress';

describe('WO-055: progress UI', () => {
  it('renders ProgressPanel composition', () => {
    render(
      <ProgressPanel
        overallPercent={40}
        elapsedMs={5000}
        layerStatuses={{ regex: 'completed', entropy: 'in_progress', llm: 'pending' }}
        earlyFindings={[]}
      />
    );
    expect(screen.getByTestId('progress-panel')).toBeTruthy();
    expect(screen.getByTestId('layer-progress-card-regex').getAttribute('data-status')).toBe('completed');
  });

  it('LayerProgressCard statuses', () => {
    const { rerender } = render(<LayerProgressCard layerName="Regex" status="pending" />);
    expect(screen.getByTestId('layer-progress-card-regex').getAttribute('data-status')).toBe('pending');
    rerender(<LayerProgressCard layerName="Regex" status="skipped" detail="WebGPU unavailable" />);
    expect(screen.getByText(/WebGPU unavailable/)).toBeTruthy();
  });

  it('EarlyFindings +N more', () => {
    const findings = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      secretType: 'api_key' as const,
      confidence: 'high' as const,
      lineNumber: i + 1,
      startColumn: 0,
      endColumn: 1,
      maskedValue: '****',
      detectionLayer: 1 as const,
      patternId: 'x',
    }));
    render(<EarlyFindings findings={findings} />);
    expect(screen.getByTestId('early-findings-more').textContent).toContain('+2');
  });

  it('OverallProgress formats elapsed', () => {
    render(<OverallProgress overallPercent={10} elapsedMs={125000} />);
    expect(screen.getByTestId('overall-elapsed').textContent).toContain('2m');
  });
});
