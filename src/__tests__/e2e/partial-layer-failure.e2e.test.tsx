/**
 * Focused E2E-style integration test for WO-044 partial layer failure.
 *
 * Playwright is not installed in this project (no playwright config / dep from WO-043).
 * This Vitest + Testing Library suite covers the same acceptance path:
 * inject a failing mock LLM engine → scan → regex/entropy findings display →
 * LLM layer shows error indicator with retry.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsPanel } from '@/components/ResultsPanel';
import { ScanOrchestrator } from '@/orchestration/scan-orchestrator';
import {
  createCrashingLlmEngine,
  MockDetectionEngine,
} from '@/__fixtures__/mock-engines';
import { useScanEngine } from '@/hooks/useScanEngine';
import { Finding } from '@/types';
import {
  SAMPLE_AWS_FINDING,
  SAMPLE_ENTROPY_FINDING,
  SAMPLE_INPUT_MULTI_SECRET,
} from '../fixtures/sample-inputs';

/** Medium-confidence regex finding on a distinct line so aggregator won't merge it with entropy. */
const mediumFinding: Finding = {
  id: 'f-medium-for-llm',
  secretType: 'token',
  lineNumber: 10,
  columnStart: 0,
  columnEnd: 20,
  confidence: 'medium',
  detectionLayer: 1,
  maskedValue: 'tok_***xxxx',
  context: 'token=tok_***xxxx',
};

function Harness({ orchestrator }: { orchestrator: ScanOrchestrator }) {
  const engine = useScanEngine(orchestrator);
  return (
    <div>
      <button
        type="button"
        data-testid="start-scan"
        onClick={() => engine.scan(SAMPLE_INPUT_MULTI_SECRET)}
      >
        Scan
      </button>
      <ResultsPanel
        scanEngine={{
          state: engine.state,
          findings: engine.findings,
          progress: engine.progress,
          error: engine.error,
          getCapabilities: engine.getCapabilities,
          reset: engine.reset,
          scan: engine.scan,
          retryLayer: () => {
            /* single-layer retry hook point for UI */
          },
        }}
        originalText={SAMPLE_INPUT_MULTI_SECRET}
      />
    </div>
  );
}

describe('WO-044 E2E: partial layer failure (Vitest stand-in for Playwright)', () => {
  it('shows regex/entropy results when LLM crashes and exposes LLM retry', async () => {
    const orchestrator = new ScanOrchestrator([
      new MockDetectionEngine({
        name: 'RegexEngine',
        layer: 1,
        findingsToReturn: [SAMPLE_AWS_FINDING, mediumFinding],
      }),
      new MockDetectionEngine({
        name: 'EntropyAnalyzer',
        layer: 3,
        findingsToReturn: [SAMPLE_ENTROPY_FINDING],
      }),
      createCrashingLlmEngine('LLM worker crashed'),
    ]);

    render(<Harness orchestrator={orchestrator} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-scan'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('layer-status-llm').getAttribute('data-status')).toBe(
        'error'
      );
    });

    expect(screen.getByTestId('layer-status-regex').getAttribute('data-status')).toBe(
      'complete'
    );
    expect(screen.getByTestId('layer-status-entropy').getAttribute('data-status')).toBe(
      'complete'
    );

    expect(screen.getByTestId(`finding-list-item-${SAMPLE_AWS_FINDING.id}`)).toBeTruthy();
    expect(
      screen.getByTestId(`finding-list-item-${SAMPLE_ENTROPY_FINDING.id}`)
    ).toBeTruthy();

    expect(screen.getByTestId('layer-engine-error-llm')).toBeTruthy();
    expect(screen.getByTestId('layer-status-retry-llm')).toBeTruthy();
  });
});
