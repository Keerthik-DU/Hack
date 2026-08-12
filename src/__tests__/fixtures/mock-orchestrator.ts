import { IScanOrchestrator, ScanCapabilities, ScanProgress } from '@/types';

// ---------------------------------------------------------------------------
// Default mock capabilities
// ---------------------------------------------------------------------------

export const MOCK_CAPABILITIES: ScanCapabilities = {
  regexAvailable: true,
  entropyAvailable: true,
  llmAvailable: false,
  webgpuSupported: false,
};

// ---------------------------------------------------------------------------
// Default progressive scan progress events
// ---------------------------------------------------------------------------

const BASE_PROGRESS: Omit<ScanProgress, 'stage' | 'percentage' | 'status'> = {
  findings: [],
};

export const MOCK_PROGRESS_EVENTS: ScanProgress[] = [
  {
    ...BASE_PROGRESS,
    status: 'scanning',
    stage: 'Layer 1: Regex scan',
    percentage: 33,
    currentEngine: 'RegexEngine',
    findings: [],
  },
  {
    ...BASE_PROGRESS,
    status: 'scanning',
    stage: 'Layer 3: Entropy analysis',
    percentage: 66,
    currentEngine: 'EntropyAnalyzer',
    findings: [],
  },
  {
    ...BASE_PROGRESS,
    status: 'complete',
    stage: 'Scan complete',
    percentage: 100,
    findings: [],
  },
];

// ---------------------------------------------------------------------------
// MockScanOrchestrator
// ---------------------------------------------------------------------------

export interface MockOrchestratorOptions {
  /** Progress events to yield (defaults to MOCK_PROGRESS_EVENTS) */
  events?: ScanProgress[];
  /** Delay between yields in ms (default 0 = synchronous) */
  yieldDelayMs?: number;
  /** If true, throws synchronously when scan() is called */
  throwOnScan?: boolean;
  /** If true, the generator throws an error after the first yield */
  throwAfterFirstYield?: boolean;
  /** Capabilities to return from getCapabilities() */
  capabilities?: ScanCapabilities;
}

/**
 * Configurable mock IScanOrchestrator for unit and integration testing.
 * Committed here so downstream UI component tests can import it directly.
 */
export class MockScanOrchestrator implements IScanOrchestrator {
  private _isAborted = false;
  private _scanCallCount = 0;
  private readonly _options: Required<MockOrchestratorOptions>;

  constructor(options: MockOrchestratorOptions = {}) {
    this._options = {
      events: options.events ?? MOCK_PROGRESS_EVENTS,
      yieldDelayMs: options.yieldDelayMs ?? 0,
      throwOnScan: options.throwOnScan ?? false,
      throwAfterFirstYield: options.throwAfterFirstYield ?? false,
      capabilities: options.capabilities ?? MOCK_CAPABILITIES,
    };
  }

  get scanCallCount(): number {
    return this._scanCallCount;
  }

  get isAborted(): boolean {
    return this._isAborted;
  }

  abort(): void {
    this._isAborted = true;
  }

  getCapabilities(): ScanCapabilities {
    return this._options.capabilities;
  }

  async *scan(scanInput: string): AsyncGenerator<ScanProgress, void, unknown> {
    void scanInput;
    this._isAborted = false;
    this._scanCallCount++;

    if (this._options.throwOnScan) {
      throw new Error('MockOrchestrator: scan initialization failed');
    }

    const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < this._options.events.length; i++) {
      if (this._isAborted) return;

      if (this._options.yieldDelayMs > 0) {
        await delay(this._options.yieldDelayMs);
      }

      if (this._isAborted) return;

      if (this._options.throwAfterFirstYield && i === 1) {
        throw new Error('MockOrchestrator: mid-scan engine failure');
      }

      yield this._options.events[i];
    }
  }
}
