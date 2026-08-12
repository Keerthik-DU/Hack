import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultsPanel, ResultsPanelScanEngine } from './ResultsPanel';
import {
  emptyScanningProgress,
  expectedFullSortOrder,
  fullThreeLayerSequence,
  llmUnavailableSequence,
  progressiveFindings,
} from '@/test/fixtures/scan-progress';
import { Finding, ScanProgress, ScanState } from '@/types';

type MutableEngine = {
  state: ScanState;
  findings: Finding[];
  progress: ScanProgress | null;
  error: string | null;
  getCapabilities: () => {
    regexAvailable: boolean;
    entropyAvailable: boolean;
    llmAvailable: boolean;
    webgpuSupported: boolean;
  };
};

function createEngine(
  overrides: Partial<ResultsPanelScanEngine> = {}
): ResultsPanelScanEngine {
  return {
    state: 'idle',
    findings: [],
    progress: null,
    error: null,
    getCapabilities: () => ({
      regexAvailable: true,
      entropyAvailable: true,
      llmAvailable: true,
      webgpuSupported: true,
    }),
    ...overrides,
  };
}

describe('WO-029: ResultsPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state while scanning with no findings yet', () => {
    render(
      <ResultsPanel
        scanEngine={createEngine({
          state: 'scanning',
          findings: [],
          progress: {
            status: 'scanning',
            stage: emptyScanningProgress.stage ?? 'scanning',
            percentage: emptyScanningProgress.percentage ?? 10,
            findings: [],
            layerStatuses: emptyScanningProgress.layerStatuses,
            scanDurationMs: emptyScanningProgress.scanDurationMs,
          },
        })}
      />
    );

    const findingsPanel = screen.getByTestId('results-tabpanel-findings');
    expect(findingsPanel.querySelector('[data-testid="results-empty-state"]')).not.toBeNull();
    expect(
      findingsPanel.querySelector('[data-testid="empty-state-message"]')?.textContent
    ).toMatch(/Faster detection/i);
  });

  it('renders findings sorted by confidence then line number', async () => {
    const findings: Finding[] = [
      progressiveFindings.entropyLow,
      progressiveFindings.regexHigh,
      progressiveFindings.llmHigh,
      progressiveFindings.regexMedium,
      progressiveFindings.entropyMedium,
    ];

    render(
      <ResultsPanel
        scanEngine={createEngine({
          state: 'complete',
          findings,
          progress: fullThreeLayerSequence[fullThreeLayerSequence.length - 1],
        })}
        originalText={'line\n'.repeat(25)}
      />
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const items = screen.getAllByTestId(/finding-list-item-/);
    expect(items.map((el) => el.getAttribute('data-finding-id'))).toEqual([
      ...expectedFullSortOrder,
    ]);
  });

  it('switches between Findings and Redacted Preview tabs', async () => {
    render(
      <ResultsPanel
        scanEngine={createEngine({
          state: 'complete',
          findings: [progressiveFindings.regexHigh],
          progress: fullThreeLayerSequence[0],
        })}
        originalText={'const awsKey = "AKIAEXAMPLE";'}
      />
    );

    await act(async () => {
      vi.runAllTimers();
    });

    fireEvent.click(screen.getByTestId('results-tab-redacted'));
    expect(screen.getByTestId('results-tabpanel-redacted').hasAttribute('hidden')).toBe(false);
    expect(screen.getByTestId('redacted-preview')).toBeDefined();
  });

  it('shows LLM unavailable status in LayerProgress', async () => {
    const last = llmUnavailableSequence[llmUnavailableSequence.length - 1];
    render(
      <ResultsPanel
        scanEngine={createEngine({
          state: 'complete',
          findings: last.findings as Finding[],
          progress: last,
          getCapabilities: () => ({
            regexAvailable: true,
            entropyAvailable: true,
            llmAvailable: false,
            webgpuSupported: false,
          }),
        })}
        originalText="sample"
      />
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('layer-progress-llm').getAttribute('data-status')).toBe(
      'unavailable'
    );
  });

  it('shows AllClearState when scan completes with zero findings', async () => {
    render(
      <ResultsPanel
        scanEngine={createEngine({
          state: 'complete',
          findings: [],
          progress: {
            status: 'complete',
            stage: 'Scan complete',
            percentage: 100,
            findings: [],
            layerStatuses: {
              regex: 'complete',
              entropy: 'complete',
              llm: 'complete',
            },
            scanDurationMs: 200,
          },
        })}
        originalText="hello world"
      />
    );

    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('all-clear-state')).toBeDefined();
  });
});

describe('WO-029: ResultsPanel progressive integration with mocked useScanEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders progressive ScanProgress updates in correct sorted order as layers complete', async () => {
    const engine: MutableEngine = {
      state: 'scanning',
      findings: [],
      progress: null,
      error: null,
      getCapabilities: () => ({
        regexAvailable: true,
        entropyAvailable: true,
        llmAvailable: true,
        webgpuSupported: true,
      }),
    };

    const { rerender } = render(
      <ResultsPanel scanEngine={engine} originalText={'x\n'.repeat(30)} />
    );

    const applyProgress = async (progress: ScanProgress) => {
      engine.state = progress.status === 'complete' ? 'complete' : 'scanning';
      engine.findings = [...progress.findings];
      engine.progress = progress;
      rerender(<ResultsPanel scanEngine={{ ...engine }} originalText={'x\n'.repeat(30)} />);
      await act(async () => {
        vi.runAllTimers();
      });
    };

    // Regex layer completes first — findings appear immediately (within 500ms flush)
    await applyProgress(fullThreeLayerSequence[1]);
    expect(screen.queryByTestId('results-empty-state')).toBeNull();
    expect(screen.getByTestId(`finding-list-item-${progressiveFindings.regexHigh.id}`)).toBeDefined();

    // Entropy adds more findings; list re-sorts
    await applyProgress(fullThreeLayerSequence[2]);
    let items = screen.getAllByTestId(/finding-list-item-/);
    expect(items.map((el) => el.getAttribute('data-finding-id'))).toEqual([
      progressiveFindings.regexHigh.id,
      progressiveFindings.regexMedium.id,
      progressiveFindings.entropyMedium.id,
      progressiveFindings.entropyLow.id,
    ]);
    expect(screen.getByTestId('layer-progress-entropy').getAttribute('data-status')).toBe(
      'complete'
    );
    expect(screen.getByTestId('layer-progress-llm').getAttribute('data-status')).toBe('pending');

    // LLM running
    await applyProgress(fullThreeLayerSequence[3]);
    expect(screen.getByTestId('layer-progress-llm').getAttribute('data-status')).toBe('running');

    // Full completion — final sorted order including LLM finding
    await applyProgress(fullThreeLayerSequence[fullThreeLayerSequence.length - 1]);
    items = screen.getAllByTestId(/finding-list-item-/);
    expect(items.map((el) => el.getAttribute('data-finding-id'))).toEqual([
      ...expectedFullSortOrder,
    ]);
    expect(screen.getByTestId('layer-progress-llm').getAttribute('data-status')).toBe('complete');
  });
});
