import {
  IScanOrchestrator,
  IDetectionEngine,
  ScanProgress,
  ScanCapabilities,
  EngineInput,
  Finding,
  AmbiguousFinding,
} from '@/types';
import { sanitizeInput } from '@/infra/input-sanitizer';
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
}

/**
 * ScanOrchestrator coordinates Layer 1 (Regex), Layer 3 (Entropy), and Layer 2 (LLM) detection engines.
 * Emits progressive ScanProgress events via an AsyncGenerator pipeline.
 */
export class ScanOrchestrator implements IScanOrchestrator {
  private readonly engines: IDetectionEngine[];
  private readonly aggregator: FindingsAggregator;
  private readonly scorer: ConfidenceScorer;
  private readonly workerThreshold: number;
  private readonly maxInputLength: number;
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
  }

  /**
   * Queries hardware & registered engine capability matrix.
   */
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

  /**
   * Aborts active scan execution.
   */
  public abort(): void {
    this.isAborted = true;
    this.abortController?.abort();
    this.abortNotify?.();
  }

  /**
   * Main scan generator method executing progressive 3-layer detection.
   */
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
      note: buildAbortNote(layerStates),
    });

    // 1. Initial validation
    if (!rawText || rawText.trim().length === 0) {
      this.abortController = null;
      this.abortNotify = null;
      yield {
        status: 'complete',
        stage: 'Scan complete',
        percentage: 100,
        findings: [],
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

    // Yield initial start event
    yield {
      status: 'scanning',
      stage: 'Initializing scan pipeline',
      percentage: 0,
      findings: [],
    };

    if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
      yield abortYield([], layerStates, 0, 'Scan aborted before dispatch');
      this.abortController = null;
      this.abortNotify = null;
      return;
    }

    // Determine worker dispatch threshold (>10K chars)
    const isWorkerDispatch = text.length > this.workerThreshold;
    void isWorkerDispatch;

    const accumulatedFindings: Finding[] = [];

    // Locate layer engines
    const layer1Engine = this.engines.find((e) => e.layer === 1 && e.isAvailable());
    const layer3Engine = this.engines.find((e) => e.layer === 3 && e.isAvailable());
    const layer2Engine = this.engines.find((e) => e.layer === 2 && e.isAvailable());

    const runLayer = async (
      layerLabel: 'Layer 1 (Regex)' | 'Layer 3 (Entropy)',
      engine: IDetectionEngine | undefined
    ): Promise<void> => {
      if (!engine) {
        layerStates[layerLabel] = 'skipped';
        return;
      }

      try {
        const findings = await engine.analyze(engineInput);
        if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
          layerStates[layerLabel] = 'interrupted';
          return;
        }

        accumulatedFindings.push(...findings);
        layerStates[layerLabel] = 'completed';
      } catch (err) {
        if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
          layerStates[layerLabel] = 'interrupted';
          return;
        }

        layerStates[layerLabel] = 'failed';
        throw err;
      }
    };

    // 2. Dispatch Layer 1 (Regex) & Layer 3 (Entropy) concurrently via Promise.allSettled
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

    if (layerStates['Layer 1 (Regex)'] === 'failed' || layerStates['Layer 3 (Entropy)'] === 'failed') {
      const failedLayer = layerStates['Layer 1 (Regex)'] === 'failed' ? 'Layer 1 (Regex)' : 'Layer 3 (Entropy)';
      yield {
        status: 'scanning',
        stage: 'Engine analysis failure',
        percentage: layer1Complete && layer3Complete ? 66 : 33,
        findings: [...accumulatedFindings],
        error: {
          message: `${failedLayer} execution failed`,
          failedLayer,
        },
      };
    } else {
      if (layer1Complete) {
        yield {
          status: 'scanning',
          stage: 'Layer 1 (RegexEngine) analysis complete',
          percentage: layer3Complete ? 66 : 33,
          currentEngine: layer1Engine?.name,
          findings: [...accumulatedFindings],
        };
      }

      if (layer3Complete) {
        yield {
          status: 'scanning',
          stage: 'Layer 3 (EntropyAnalyzer) analysis complete',
          percentage: 66,
          currentEngine: layer3Engine?.name,
          findings: [...accumulatedFindings],
        };
      }
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

    // 3. Layer 2 (LLM) Analysis for Ambiguous Findings
    const ambiguousFindings = accumulatedFindings.filter(
      (f) => f.confidence !== 'high'
    ) as AmbiguousFinding[];

    if (layer2Engine && ambiguousFindings.length > 0) {
      layerStates['Layer 2 (LLM)'] = 'pending';
      yield {
        status: 'scanning',
        stage: 'Dispatching ambiguous findings to Layer 2 LLM Engine',
        percentage: 75,
        currentEngine: layer2Engine.name,
        findings: [...accumulatedFindings],
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

          const llmFindings = await layer2Engine.analyze(llmInput);

          if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
            layerStates['Layer 2 (LLM)'] = 'interrupted';
            return;
          }

          accumulatedFindings.push(...llmFindings);
          layerStates['Layer 2 (LLM)'] = 'completed';
        } catch (err) {
          if (signal.aborted || this.scanToken !== scanToken || this.isAborted) {
            layerStates['Layer 2 (LLM)'] = 'interrupted';
            return;
          }

          layerStates['Layer 2 (LLM)'] = 'failed';
          throw err;
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
        };
      } else if (llmState === 'failed') {
        yield {
          status: 'scanning',
          stage: 'Layer 2 LLM analysis failed',
          percentage: 90,
          findings: [...accumulatedFindings],
          error: {
            message: 'Layer 2 LLM Engine failed',
            failedLayer: 'Layer 2 (LLM)',
          },
        };
      }
    } else {
      layerStates['Layer 2 (LLM)'] = 'skipped';
      yield {
        status: 'scanning',
        stage: 'Layer 2 LLM analysis skipped (no ambiguous findings or LLM unavailable)',
        percentage: 90,
        findings: [...accumulatedFindings],
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

    // 4. Final Aggregation & Scoring
    const aggregated = this.aggregator.aggregate(accumulatedFindings);
    const finalScored = this.scorer.score(aggregated);

    yield {
      status: 'complete',
      stage: 'Scan complete',
      percentage: 100,
      findings: finalScored,
    };

    this.abortController = null;
    this.abortNotify = null;
  }
}
