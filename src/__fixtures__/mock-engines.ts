import {
  AirGapError,
  DetectionLayerName,
  EngineInput,
  ErrorCode,
  Finding,
  IDetectionEngine,
  LayerStatus,
  ScanProgress,
} from '@/types';
import {
  createDetectionLayerError,
  createScanEngineError,
} from '@/errors/airgap-error';

export interface MockEngineOptions {
  name: string;
  layer: 1 | 2 | 3;
  isAvailable?: boolean;
  delayMs?: number;
  findingsToReturn?: Finding[];
  shouldFail?: boolean;
  errorMessage?: string;
  /** When set, throws a typed AirGapError instead of a generic Error. */
  airgapError?: AirGapError & Error;
  hangForever?: boolean;
}

function layerNameFromNumber(layer: 1 | 2 | 3): DetectionLayerName {
  if (layer === 1) return 'regex';
  if (layer === 2) return 'llm';
  return 'entropy';
}

/**
 * Configurable mock IDetectionEngine for orchestrator / UI tests (WO-044).
 */
export class MockDetectionEngine implements IDetectionEngine {
  public readonly name: string;
  public readonly layer: 1 | 2 | 3;
  public readonly available: boolean;
  public readonly delayMs: number;
  public readonly findingsToReturn: Finding[];
  public readonly shouldFail: boolean;
  public readonly errorMessage: string;
  public readonly airgapError?: AirGapError & Error;
  public readonly hangForever: boolean;
  public analyzeCallCount = 0;
  public terminated = false;

  constructor(options: MockEngineOptions) {
    this.name = options.name;
    this.layer = options.layer;
    this.available = options.isAvailable ?? true;
    this.delayMs = options.delayMs ?? 0;
    this.findingsToReturn = options.findingsToReturn ?? [];
    this.shouldFail = options.shouldFail ?? false;
    this.errorMessage = options.errorMessage ?? `${options.name} failed execution`;
    this.airgapError = options.airgapError;
    this.hangForever = options.hangForever ?? false;
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public async analyze(input: EngineInput): Promise<Finding[]> {
    this.analyzeCallCount++;

    if (input.signal?.aborted) {
      this.terminated = true;
      return [];
    }

    if (this.hangForever) {
      return await new Promise<Finding[]>(() => {
        /* never resolves — used for timeout tests */
      });
    }

    if (this.delayMs > 0) {
      const aborted = await this.waitForDelay(this.delayMs, input.signal);
      if (aborted) {
        return [];
      }
    }

    if (input.signal?.aborted) {
      this.terminated = true;
      return [];
    }

    if (this.shouldFail || this.airgapError) {
      if (this.airgapError) {
        throw this.airgapError;
      }
      throw new Error(this.errorMessage);
    }

    return [...this.findingsToReturn];
  }

  private async waitForDelay(delayMs: number, signal?: AbortSignal): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      if (signal?.aborted) {
        this.terminated = true;
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, delayMs);

      const onAbort = () => {
        this.terminated = true;
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      };

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

/** Throws DetectionLayerError for the given layer. */
export function createThrowingDetectionEngine(
  layer: 1 | 2 | 3,
  message?: string
): MockDetectionEngine {
  const layerName = layerNameFromNumber(layer);
  return new MockDetectionEngine({
    name: `${layerName}-throwing`,
    layer,
    airgapError: createDetectionLayerError({
      code: ErrorCode.DETECTION_LAYER_FAILED,
      message: message ?? `${layerName} worker crashed`,
      layer: layerName,
    }),
  });
}

/** Throws ScanEngineError (catastrophic). */
export function createThrowingScanEngineError(message?: string): MockDetectionEngine {
  return new MockDetectionEngine({
    name: 'catastrophic-engine',
    layer: 2,
    airgapError: createScanEngineError({
      code: ErrorCode.SCAN_ENGINE_FAILED,
      message: message ?? 'Catastrophic scan engine failure',
      layer: 'llm',
    }),
  });
}

/** LLM mock that simulates a Web Worker crash. */
export function createCrashingLlmEngine(message = 'LLM worker crashed'): MockDetectionEngine {
  return createThrowingDetectionEngine(2, message);
}

/**
 * Mixed ok/error LayerStatus fixtures for UI tests.
 */
export const mixedLayerStatusFixtures: {
  readonly llmFailed: readonly LayerStatus[];
  readonly allFailed: readonly LayerStatus[];
  readonly allComplete: readonly LayerStatus[];
} = {
  llmFailed: [
    { layer: 'regex', status: 'complete', findings: [] },
    { layer: 'entropy', status: 'complete', findings: [] },
    {
      layer: 'llm',
      status: 'error',
      error: createDetectionLayerError({
        code: ErrorCode.DETECTION_LAYER_FAILED,
        message: 'LLM worker crashed',
        layer: 'llm',
      }),
      findings: [],
    },
  ],
  allFailed: [
    {
      layer: 'regex',
      status: 'error',
      error: createDetectionLayerError({
        code: ErrorCode.DETECTION_LAYER_FAILED,
        message: 'Regex failed',
        layer: 'regex',
      }),
      findings: [],
    },
    {
      layer: 'entropy',
      status: 'error',
      error: createDetectionLayerError({
        code: ErrorCode.DETECTION_LAYER_FAILED,
        message: 'Entropy failed',
        layer: 'entropy',
      }),
      findings: [],
    },
    {
      layer: 'llm',
      status: 'error',
      error: createDetectionLayerError({
        code: ErrorCode.DETECTION_LAYER_FAILED,
        message: 'LLM failed',
        layer: 'llm',
      }),
      findings: [],
    },
  ],
  allComplete: [
    { layer: 'regex', status: 'complete', findings: [] },
    { layer: 'entropy', status: 'complete', findings: [] },
    { layer: 'llm', status: 'complete', findings: [] },
  ],
};

/** ScanProgress events with mixed ok/error layer statuses. */
export const mixedScanProgressFixtures: {
  readonly partialLlmFailure: ScanProgress;
  readonly allLayersFailed: ScanProgress;
} = {
  partialLlmFailure: {
    status: 'complete',
    stage: 'Scan complete',
    percentage: 100,
    findings: [],
    layerStatuses: mixedLayerStatusFixtures.llmFailed,
  },
  allLayersFailed: {
    status: 'complete',
    stage: 'All detection layers encountered errors. Please retry.',
    percentage: 100,
    findings: [],
    layerStatuses: mixedLayerStatusFixtures.allFailed,
    error: {
      message: 'All detection layers encountered errors. Please retry.',
    },
  },
};
