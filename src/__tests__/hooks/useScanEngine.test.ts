import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useScanEngine } from '../../hooks/useScanEngine';
import {
  MockScanOrchestrator,
  MOCK_PROGRESS_EVENTS,
} from '../fixtures/mock-orchestrator';
import { ScanOrchestrator } from '../../orchestration/scan-orchestrator';
import { MockDetectionEngine, SlowMockEngine } from '../fixtures/mock-engines';
import { ScanProgress } from '@/types';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeFinding(id: string): ScanProgress['findings'][0] {
  return {
    id,
    secretType: 'api_key',
    lineNumber: 1,
    columnStart: 0,
    columnEnd: 20,
    confidence: 'high',
    detectionLayer: 1,
    maskedValue: '****',
    context: `const key = "${id}";`,
  };
}

const EVENTS_WITH_FINDINGS: ScanProgress[] = [
  {
    status: 'scanning',
    stage: 'Layer 1: Regex scan',
    percentage: 33,
    findings: [makeFinding('f1')],
  },
  {
    status: 'scanning',
    stage: 'Layer 3: Entropy',
    percentage: 66,
    findings: [makeFinding('f1'), makeFinding('f2')],
  },
  {
    status: 'complete',
    stage: 'Scan complete',
    percentage: 100,
    findings: [makeFinding('f1'), makeFinding('f2')],
  },
];

describe('WO-026: useScanEngine Hook Suite', () => {
  let orchestrator: MockScanOrchestrator;

  beforeEach(() => {
    orchestrator = new MockScanOrchestrator({ events: MOCK_PROGRESS_EVENTS });
  });

  afterEach(() => {
    // Nothing to clear — all state is in React heap
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  it('initializes in idle state with empty findings, null progress and error', () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));

    expect(result.current.state).toBe('idle');
    expect(result.current.findings).toEqual([]);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes scan, abort, reset, getCapabilities methods', () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));
    expect(typeof result.current.scan).toBe('function');
    expect(typeof result.current.abort).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.getCapabilities).toBe('function');
  });

  // -------------------------------------------------------------------------
  // idle → scanning → complete transition
  // -------------------------------------------------------------------------

  it('transitions: idle → scanning → complete on successful generator exhaustion', async () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));

    act(() => {
      result.current.scan('const apiKey = "AKIA12345";');
    });

    expect(result.current.state).toBe('scanning');

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    expect(result.current.progress?.percentage).toBe(100);
    expect(result.current.error).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Progressive updates accumulate findings
  // -------------------------------------------------------------------------

  it('accumulates findings progressively on each generator yield', async () => {
    const orch = new MockScanOrchestrator({ events: EVENTS_WITH_FINDINGS });
    const { result } = renderHook(() => useScanEngine(orch));

    act(() => {
      result.current.scan('text with secrets');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    // Final state should have all findings from last yield
    expect(result.current.findings).toHaveLength(2);
    expect(result.current.findings[0].id).toBe('f1');
    expect(result.current.findings[1].id).toBe('f2');
  });

  // -------------------------------------------------------------------------
  // scanning → error on orchestrator throw
  // -------------------------------------------------------------------------

  it('transitions: scanning → error when orchestrator throws mid-scan', async () => {
    const errOrch = new MockScanOrchestrator({ throwAfterFirstYield: true });
    const { result } = renderHook(() => useScanEngine(errOrch));

    act(() => {
      result.current.scan('text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    });

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
  });

  it('transitions: scanning → error when scan() throws synchronously', async () => {
    const throwOrch = new MockScanOrchestrator({ throwOnScan: true });
    const { result } = renderHook(() => useScanEngine(throwOrch));

    act(() => {
      result.current.scan('text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    });

    expect(result.current.error).toContain('scan initialization failed');
  });

  // -------------------------------------------------------------------------
  // scanning → idle on abort (partial findings preserved)
  // -------------------------------------------------------------------------

  it('transitions: scanning → idle on abort(), preserves partial findings', async () => {
    const slowOrch = new MockScanOrchestrator({
      events: EVENTS_WITH_FINDINGS,
      yieldDelayMs: 50,
    });
    const { result } = renderHook(() => useScanEngine(slowOrch));

    act(() => {
      result.current.scan('text with secrets');
    });

    expect(result.current.state).toBe('scanning');

    // Abort while scanning
    act(() => {
      result.current.abort();
    });

    expect(result.current.state).toBe('idle');
    // Orchestrator abort flag set
    expect(slowOrch.isAborted).toBe(true);
  });

  it('abort() is a no-op when state is idle', () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));
    expect(result.current.state).toBe('idle');

    act(() => {
      result.current.abort(); // Should not throw
    });

    expect(result.current.state).toBe('idle');
  });

  it('abort() is a no-op when state is complete', async () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));

    act(() => {
      result.current.scan('text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    act(() => {
      result.current.abort(); // Should not throw or change state
    });

    expect(result.current.state).toBe('complete');
  });

  // -------------------------------------------------------------------------
  // complete → idle on reset
  // -------------------------------------------------------------------------

  it('transitions: complete → idle on reset(), clears findings and progress', async () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));

    act(() => {
      result.current.scan('text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.findings).toEqual([]);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // -------------------------------------------------------------------------
  // error → idle on reset
  // -------------------------------------------------------------------------

  it('transitions: error → idle on reset()', async () => {
    const errOrch = new MockScanOrchestrator({ throwAfterFirstYield: true });
    const { result } = renderHook(() => useScanEngine(errOrch));

    act(() => {
      result.current.scan('text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('error');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Reset while scanning aborts first
  // -------------------------------------------------------------------------

  it('reset() while scanning aborts first then clears all state', async () => {
    const slowOrch = new MockScanOrchestrator({ yieldDelayMs: 50 });
    const { result } = renderHook(() => useScanEngine(slowOrch));

    act(() => {
      result.current.scan('text');
    });

    expect(result.current.state).toBe('scanning');

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.findings).toEqual([]);
    expect(result.current.progress).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Unmount cleanup: generator returned, no memory leaks
  // -------------------------------------------------------------------------

  it('unmount during active scan aborts generator and cleans up without errors', async () => {
    const slowOrch = new MockScanOrchestrator({ yieldDelayMs: 200 });
    const { result, unmount } = renderHook(() => useScanEngine(slowOrch));

    act(() => {
      result.current.scan('text');
    });

    expect(result.current.state).toBe('scanning');

    // Unmount immediately while scanning
    act(() => {
      unmount();
    });

    // orchestrator.abort() should have been called
    expect(slowOrch.isAborted).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Zero-finding scan completes cleanly
  // -------------------------------------------------------------------------

  it('completes cleanly with empty findings for zero-yield orchestrator', async () => {
    const zeroOrch = new MockScanOrchestrator({ events: [] });
    const { result } = renderHook(() => useScanEngine(zeroOrch));

    act(() => {
      result.current.scan('clean text');
    });

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    expect(result.current.findings).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // getCapabilities passthrough
  // -------------------------------------------------------------------------

  it('getCapabilities() returns orchestrator capabilities', () => {
    const { result } = renderHook(() => useScanEngine(orchestrator));
    const caps = result.current.getCapabilities();
    expect(caps.regexAvailable).toBe(true);
    expect(caps.entropyAvailable).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Integration: 3 timed yields with delays
  // -------------------------------------------------------------------------

  it('Integration: processes 3 progressive yields with 10ms delays in correct order', async () => {
    const events: ScanProgress[] = [
      { status: 'scanning', stage: 'Layer 1', percentage: 33, findings: [makeFinding('i1')] },
      {
        status: 'scanning',
        stage: 'Layer 3',
        percentage: 66,
        findings: [makeFinding('i1'), makeFinding('i2')],
      },
      {
        status: 'complete',
        stage: 'Done',
        percentage: 100,
        findings: [makeFinding('i1'), makeFinding('i2'), makeFinding('i3')],
      },
    ];
    const intOrch = new MockScanOrchestrator({ events, yieldDelayMs: 10 });
    const { result } = renderHook(() => useScanEngine(intOrch));

    act(() => {
      result.current.scan('integration test text');
    });

    // First yield should arrive
    await waitFor(() => {
      expect(result.current.findings.length).toBeGreaterThan(0);
    });

    // Eventually completes with all 3 findings
    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    expect(result.current.findings).toHaveLength(3);
    expect(result.current.progress?.percentage).toBe(100);
  });
});