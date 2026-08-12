import {
  IScanOrchestrator,
  IDetectionEngine,
  ScanProgress,
  ScanCapabilities,
  EngineInput,
  Finding,
  AmbiguousFinding,
  LayerStatus,
  DetectionLayerName,
  ErrorCode,
  AirGapError,
} from '@/types';
import { sanitizeInput } from '@/infra/input-sanitizer';
import { Logger } from '@/infra/logger';
import {
  createDetectionLayerError,
  toAirGapErrorFromUnknown,
} from '@/errors/airgap-error';
import { prepareForLLM } from './text-preprocessor';
import { FindingsAggregator } from './findings-aggregator';
import { ConfidenceScorer } from './confidence-scorer';

export interface ScanOrchestratorOptions {
  /** Custom FindingsAggregator instance */
  aggregator?: FindingsAggregator;
  /** Custom ConfidenceScorer instance */
  scorer?: ConfidenceScorer;
  /** Character threshold for offloading analysis to Web Worker (default: 10,000) */
  workerThreshold?: number;
  /** Maximum allowed input length in characters (default: 100,000) */
  maxInputLength?: number;
  /** Timeout for regex engine analyze() in ms (default: 10,000) */
  regexTimeoutMs?: number;
  /** Timeout for entropy engine analyze() in ms (default: 10,000) */
  entropyTimeoutMs?: number;
  /** Timeout for LLM engine analyze() in ms (default: 30,000) */
  llmTimeoutMs?: number;
}

type MutableLayerStatus = {
  layer: DetectionLayerName;
  status: 'pending' | 'complete' | 'error';
  error?: AirGapError;
  findings: Finding[];
};

function createInitialLayerStatuses(): MutableLayerStatus[] {
  return [
    { layer: 'regex', status: 'pending', findings: [] },
    { layer: 'entropy', status: 'pending', findings: [] },
    { layer: 'llm', status: 'pending', findings: [] },
  ];
}

function snapshotLayerStatuses(list: MutableLayerStatus[]): LayerStatus[] {
  return list.map((entry) => ({
    layer: entry.layer,
    status: entry.status,
    ...(entry.error ? { error: entry.error } : {}),
    findings: [...entry.findings],
  }));
}

function updateLayerStatus(
  list: MutableLayerStatus[],
  layer: DetectionLayerName,
  patch: Partial<Omit<MutableLayerStatus, 'layer'>>
): void {
  const entry = list.find((item) => item.layer === layer);
  if (!entry) return;
  if (patch.status !== undefined) entry.status = patch.status;
  if (patch.error !== undefined) entry.error = patch.error;
  if (patch.findings !== undefined) entry.findings = patch.findings;
}

function isAirGapTimeout(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === ErrorCode.ANALYSIS_TIMEOUT
  );
}

/**
 * ScanOrchestrator coordinates Layer 1 (Regex), Layer 3 (Entropy), and Layer 2 (LLM) detection engines.
 * Emits progressive ScanProgress events via an AsyncGenerator pipeline.
 * Per-engine failures are isolated (WO-044): remaining engines continue and partial results are yielded.
 */
export class ScanOrchestrator implements IScanOrchestrator {
  private readonly engines: IDetectionEngine[];
  private readonly aggregator: FindingsAggregator;
  private readonly scorer: ConfidenceScorer;
  private readonly workerThreshold: number;
  private readonly maxInputLength: number;
  private readonly regexTimeoutMs: number;
  private readonly entropyTimeoutMs: number;
  private readonly llmTimeoutMs: number;
  private isAborted = false;
  private abortController: AbortController | null = null;
  private abortNotify: (() => void) | null = null;
  private scanToken = 0;

  constructor(engines: IDetectionEngine[], options?: ScanOrchestratorOptions) {
    this.engines = engines;
    this.aggregator = options?.aggregator ?? new FindingsAggregator();
    this.scorer = options?.scorer ?? new ConfidenceScorer();
    this.workerThreshold = options?.workerThreshold ?? 10000;
    this.maxInputLength = options?.maxInputLength ?? 100000;
    this.regexTimeoutMs = options?.regexTimeoutMs ?? 10_000;
    this.entropyTimeoutMs = options?.entropyTimeoutMs ?? 10_000;
    this.llmTimeoutMs = options?.llmTimeoutMs ?? 30_000;
  }

  public getCapabilities(): ScanCapabilities {
    const regexEngine = this.engines.find((e) => e.layer === 1);
    const entropyEngine = this.engines.find((e) => e.layer === 3);
    const llmEngine = this.engines.find((e) => e.layer === 2);

    return {
      regexAvailable: regexEngine ? regexEngine.isAvailable() : false,
      entropyAvailable: entropyEngine ? entropyEngine.isAvailable() : false,
      llmAvailable: llmEngine ? llmEngine.isAvailable() : false,
      webgpuSupported: typeof navigator !== 'undefined' && 'gpu' in navigator,
    };
  }

  public abort(): void {
    this.isAborted = true;
    this.abortController?.abort();
    this.abortNotify?.();
  }

  private timeoutForLayer(layer: DetectionLayerName): number {
    if (layer === 'llm') return this.llmTimeoutMs;
    if (layer === 'entropy') return this.entropyTimeoutMs;
    return this.regexTimeoutMs;
  }

  private async analyzeWithTimeout(
    engine: IDetectionEngine,
    input: EngineInput,
    layer: DetectionLayerName
  ): Promise<Finding[]> {
    const timeoutMs = this.timeoutForLayer(layer);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          createDetectionLayerError({
            code: ErrorCode.ANALYSIS_TIMEOUT,
            message: `${layer} analysis timed out after ${timeoutMs}ms`,
            layer,
          })
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([engine.analyze(input), timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  public async *scan(input: string | EngineInput): AsyncGenerator<ScanProgress, void, unknown> {
    this.isAborted = false;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const scanToken = ++this.scanToken;
    const rawText = typeof input === 'string' ? input : input.text;
    const abortPromise = new Promise<'aborted'>((resolve) => {
      this.abortNotify = () => resolve('aborted');
    });

    type LayerState = 'pending' | 'completed' | 'failed' | 'interrupted' | 'skipped';
    type LayerStateMap = Record<'Layer 1 (Regex)' | 'Layer 3 (Entropy)' | 'Layer 2 (LLM)', LayerState>;

    const layerStatuses = createInitialLayerStatuses();

    const buildAbortNote = (layerStates: LayerStateMap) => {
      const completed = Object.entries(layerStates)
        .filter(([, status]) => status === 'completed')
        .map(([label]) => label);
      const interrupted = Object.entries(layerStates)
        .filter(([, status]) => status === 'pending' || status === 'interrupted')
        .map(([label]) => label);
      const skipped = Object.entries(layerStates)
        .filter(([, status]) => status === 'skipped')
        .map(([label]) => label);

      const completedText = completed.length > 0 ? completed.join(', ') : 'none';
      const interruptedText = interrupted.length > 0 ? interrupted.join(', ') : 'none';
      const skippedText = skipped.length > 0 ? skipped.join(', ') : 'none';

      return `Completed layers: ${completedText}; Interrupted layers: ${interruptedText}; Skipped layers: ${skippedText}`;
    };

    const abortYield = (
      findings: Finding[],
      layerStates: LayerStateMap,
      percentage: number,
      stage: string
    ): ScanProgress => ({
      status: 'aborted',
      stage,
      percentage,
      findings,
      layerStatuses: snapshotLayerStatuses(layerStatuses),
      note: buildAbortNote(layerStates),
    });

    if (!rawText || rawText.trim().length === 0) {
      this.abortController = null;
      this.abortNotify = null;
      updateLayerStatus(layerStatuses, 'regex', { status: 'complete' });
      updateLayerStatus(layerStatuses, 'entropy', { status: 'complete' });
      updateLayerStatus(layerStatuses, 'llm', { status: 'complete' });
      yield {
        status: 'complete',
        stage: 'Scan complete',
        percentage: 100,
        findings: [],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
      };
      return;
    }

    if (rawText.length > this.maxInputLength) {
      this.abortController = null;
      this.abortNotify = null;
      yield {
        status: 'error',
        stage: 'Input validation failed',
        percentage: 0,
        findings: [],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
        error: {
          message: `Input length (${rawText.length} chars) exceeds maximum allowed limit of ${this.maxInputLength} characters.`,
        },
      };
      return;
    }

    const text = sanitizeInput(rawText);
    const lines = text.split('\n');
    const engineInput: EngineInput = { text, lines, signal };
    const layerStates: LayerStateMap = {
      'Layer 1 (Regex)': 'pending',
      'Layer 3 (Entropy)': 'pending',
      'Layer 2 (LLM)': 'skipped',
    };

    yield {
      status: 'scanning',
      stage: 'Initializing scan pipeline',
      percentage: 0,
      findings: [],
      layerStatuses: snapshotLayerStatuses(layerStatuses),
    };

    if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
      yield abortYield([], layerStates, 0, 'Scan aborted before dispatch');
      this.abortController = null;
      this.abortNotify = null;
      return;
    }

    const isWorkerDispatch = text.length > this.workerThreshold;
    void isWorkerDispatch;

    const accumulatedFindings: Finding[] = [];

    const layer1Engine = this.engines.find((e) => e.layer === 1 && e.isAvailable());
    const layer3Engine = this.engines.find((e) => e.layer === 3 && e.isAvailable());
    const layer2Engine = this.engines.find((e) => e.layer === 2 && e.isAvailable());

    const runLayer = async (
      layerLabel: 'Layer 1 (Regex)' | 'Layer 3 (Entropy)',
      engine: IDetectionEngine | undefined
    ): Promise<void> => {
      const layerName: DetectionLayerName =
        layerLabel === 'Layer 1 (Regex)' ? 'regex' : 'entropy';

      if (!engine) {
        layerStates[layerLabel] = 'skipped';
        updateLayerStatus(layerStatuses, layerName, { status: 'complete', findings: [] });
        return;
      }

      try {
        const findings = await this.analyzeWithTimeout(engine, engineInput, layerName);
        if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
          layerStates[layerLabel] = 'interrupted';
          return;
        }

        accumulatedFindings.push(...findings);
        layerStates[layerLabel] = 'completed';
        updateLayerStatus(layerStatuses, layerName, {
          status: 'complete',
          findings: [...findings],
        });
      } catch (err) {
        if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
          layerStates[layerLabel] = 'interrupted';
          return;
        }

        const airgapError = toAirGapErrorFromUnknown(err, {
          code: isAirGapTimeout(err)
            ? ErrorCode.ANALYSIS_TIMEOUT
            : ErrorCode.DETECTION_LAYER_FAILED,
          message: `${layerLabel} execution failed`,
          layer: layerName,
        });

        Logger.error(`${layerName} detection layer failed`, airgapError, {
          code: airgapError.code,
          layer: layerName,
        });

        layerStates[layerLabel] = 'failed';
        updateLayerStatus(layerStatuses, layerName, {
          status: 'error',
          error: airgapError,
          findings: [],
        });
      }
    };

    const layer1Dispatch = runLayer('Layer 1 (Regex)', layer1Engine);
    const layer3Dispatch = runLayer('Layer 3 (Entropy)', layer3Engine);
    const dispatchPromise = Promise.allSettled([layer1Dispatch, layer3Dispatch]);
    const dispatchOutcome = await Promise.race([
      dispatchPromise.then(() => 'completed' as const),
      abortPromise,
    ]);

    if (signal.aborted || this.scanToken !== scanToken || this.isAborted || dispatchOutcome === 'aborted') {
      await Promise.resolve();
      yield abortYield(
        [...accumulatedFindings],
        layerStates,
        accumulatedFindings.length > 0 ? 33 : 0,
        'Scan aborted during concurrent engine execution'
      );
      this.abortController = null;
      this.abortNotify = null;
      return;
    }

    const layer1Complete = layerStates['Layer 1 (Regex)'] === 'completed';
    const layer3Complete = layerStates['Layer 3 (Entropy)'] === 'completed';
    const layer1Failed = layerStates['Layer 1 (Regex)'] === 'failed';
    const layer3Failed = layerStates['Layer 3 (Entropy)'] === 'failed';

    if (layer1Complete || layer1Failed) {
      yield {
        status: 'scanning',
        stage: layer1Failed
          ? 'Layer 1 (RegexEngine) analysis failed'
          : 'Layer 1 (RegexEngine) analysis complete',
        percentage: layer3Complete || layer3Failed ? 66 : 33,
        currentEngine: layer1Engine?.name,
        findings: [...accumulatedFindings],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
        ...(layer1Failed
          ? {
              error: {
                message: 'Layer 1 (Regex) execution failed',
                failedLayer: 'Layer 1 (Regex)',
              },
            }
          : {}),
      };
    }

    if (layer3Complete || layer3Failed) {
      yield {
        status: 'scanning',
        stage: layer3Failed
          ? 'Layer 3 (EntropyAnalyzer) analysis failed'
          : 'Layer 3 (EntropyAnalyzer) analysis complete',
        percentage: 66,
        currentEngine: layer3Engine?.name,
        findings: [...accumulatedFindings],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
        ...(layer3Failed
          ? {
              error: {
                message: 'Layer 3 (Entropy) execution failed',
                failedLayer: 'Layer 3 (Entropy)',
              },
            }
          : {}),
      };
    }

    if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
      yield abortYield(
        [...accumulatedFindings],
        layerStates,
        accumulatedFindings.length > 0 ? 66 : 33,
        'Scan aborted before LLM dispatch'
      );
      this.abortController = null;
      this.abortNotify = null;
      return;
    }

    const ambiguousFindings = accumulatedFindings.filter(
      (f) => f.confidence !== 'high'
    ) as AmbiguousFinding[];

    const capabilities = this.getCapabilities();
    if (!capabilities.llmAvailable) {
      Logger.info('LLM layer skipped — capabilities.llmAvailable is false', {
        layer: 'llm',
      });
    }

    if (layer2Engine && capabilities.llmAvailable && ambiguousFindings.length > 0) {
      layerStates['Layer 2 (LLM)'] = 'pending';
      yield {
        status: 'scanning',
        stage: 'Dispatching ambiguous findings to Layer 2 LLM Engine',
        percentage: 75,
        currentEngine: layer2Engine.name,
        findings: [...accumulatedFindings],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
      };

      const llmDispatch = (async () => {
        try {
          const promptContexts = prepareForLLM(ambiguousFindings, text);
          const llmInput: EngineInput = {
            text,
            lines,
            options: { promptContexts, ambiguousFindings },
            signal,
          };

          const llmFindings = await this.analyzeWithTimeout(layer2Engine, llmInput, 'llm');

          if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
            layerStates['Layer 2 (LLM)'] = 'interrupted';
            return;
          }

          accumulatedFindings.push(...llmFindings);
          layerStates['Layer 2 (LLM)'] = 'completed';
          updateLayerStatus(layerStatuses, 'llm', {
            status: 'complete',
            findings: [...llmFindings],
          });
        } catch (err) {
          if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
            layerStates['Layer 2 (LLM)'] = 'interrupted';
            return;
          }

          const airgapError = toAirGapErrorFromUnknown(err, {
            code: isAirGapTimeout(err)
              ? ErrorCode.ANALYSIS_TIMEOUT
              : ErrorCode.DETECTION_LAYER_FAILED,
            message: 'Layer 2 LLM Engine failed',
            layer: 'llm',
          });

          Logger.error('llm detection layer failed', airgapError, {
            code: airgapError.code,
            layer: 'llm',
          });

          layerStates['Layer 2 (LLM)'] = 'failed';
          updateLayerStatus(layerStatuses, 'llm', {
            status: 'error',
            error: airgapError,
            findings: [],
          });
        }
      })();

      const llmOutcome = await Promise.race([
        llmDispatch.then(() => 'completed' as const),
        abortPromise,
      ]);

      if (signal.aborted || this.scanToken !== scanToken || this.isAborted || llmOutcome === 'aborted') {
        await Promise.resolve();
        yield abortYield(
          [...accumulatedFindings],
          layerStates,
          accumulatedFindings.length > 0 ? 75 : 66,
          'Scan aborted during LLM processing'
        );
        this.abortController = null;
        this.abortNotify = null;
        return;
      }

      const llmState = layerStates['Layer 2 (LLM)'] as LayerState;

      if (llmState === 'completed') {
        yield {
          status: 'scanning',
          stage: 'Layer 2 (LLM) analysis complete',
          percentage: 90,
          currentEngine: layer2Engine.name,
          findings: [...accumulatedFindings],
          layerStatuses: snapshotLayerStatuses(layerStatuses),
        };
      } else if (llmState === 'failed') {
        yield {
          status: 'scanning',
          stage: 'Layer 2 LLM analysis failed',
          percentage: 90,
          findings: [...accumulatedFindings],
          layerStatuses: snapshotLayerStatuses(layerStatuses),
          error: {
            message: 'Layer 2 LLM Engine failed',
            failedLayer: 'Layer 2 (LLM)',
          },
        };
      }
    } else {
      layerStates['Layer 2 (LLM)'] = 'skipped';
      updateLayerStatus(layerStatuses, 'llm', { status: 'complete', findings: [] });
      const skipReason = !capabilities.llmAvailable
        ? 'LLM layer unavailable (WebGPU not supported or memory pressure)'
        : 'no ambiguous findings or LLM engine not registered';
      yield {
        status: 'scanning',
        stage: `Layer 2 LLM analysis skipped (${skipReason})`,
        percentage: 90,
        findings: [...accumulatedFindings],
        layerStatuses: snapshotLayerStatuses(layerStatuses),
      };
    }

    if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
      await Promise.resolve();
      yield abortYield(
        [...accumulatedFindings],
        layerStates,
        accumulatedFindings.length > 0 ? 90 : 75,
        'Scan aborted before final aggregation'
      );
      this.abortController = null;
      this.abortNotify = null;
      return;
    }

    const aggregated = this.aggregator.aggregate(accumulatedFindings);
    const finalScored = this.scorer.score(aggregated);
    const allFailed = layerStatuses.every((entry) => entry.status === 'error');

    yield {
      status: 'complete',
      stage: allFailed
        ? 'All detection layers encountered errors. Please retry.'
        : 'Scan complete',
      percentage: 100,
      findings: finalScored,
      layerStatuses: snapshotLayerStatuses(layerStatuses),
      ...(allFailed
        ? {
            error: {
              message: 'All detection layers encountered errors. Please retry.',
            },
          }
        : {}),
    };

    this.abortController = null;
    this.abortNotify = null;
  }
}
