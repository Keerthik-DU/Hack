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
  }

  /**
   * Main scan generator method executing progressive 3-layer detection.
   */
  public async *scan(input: string | EngineInput): AsyncGenerator<ScanProgress, void, unknown> {
    this.isAborted = false;
    const rawText = typeof input === 'string' ? input : input.text;

    // 1. Initial validation
    if (!rawText || rawText.trim().length === 0) {
      yield {
        status: 'complete',
        stage: 'Scan complete',
        percentage: 100,
        findings: [],
      };
      return;
    }

    if (rawText.length > this.maxInputLength) {
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
    const engineInput: EngineInput = { text, lines };

    // Yield initial start event
    yield {
      status: 'scanning',
      stage: 'Initializing scan pipeline',
      percentage: 0,
      findings: [],
    };

    // Determine worker dispatch threshold (>10K chars)
    const isWorkerDispatch = text.length > this.workerThreshold;
    void isWorkerDispatch;

    const accumulatedFindings: Finding[] = [];

    // Locate layer engines
    const layer1Engine = this.engines.find((e) => e.layer === 1 && e.isAvailable());
    const layer3Engine = this.engines.find((e) => e.layer === 3 && e.isAvailable());
    const layer2Engine = this.engines.find((e) => e.layer === 2 && e.isAvailable());

    // 2. Dispatch Layer 1 (Regex) & Layer 3 (Entropy) concurrently via Promise.allSettled
    const layerDispatches: Array<Promise<{ layer: number; name: string; findings: Finding[] }>> =
      [];

    if (layer1Engine) {
      layerDispatches.push(
        layer1Engine
          .analyze(engineInput)
          .then((res) => ({ layer: 1, name: layer1Engine.name, findings: res }))
      );
    }

    if (layer3Engine) {
      layerDispatches.push(
        layer3Engine
          .analyze(engineInput)
          .then((res) => ({ layer: 3, name: layer3Engine.name, findings: res }))
      );
    }

    const concurrentResults = await Promise.allSettled(layerDispatches);

    if (this.isAborted) return;

    let hasLayer1Complete = false;
    let hasLayer3Complete = false;

    for (const result of concurrentResults) {
      if (result.status === 'fulfilled') {
        const { layer, name, findings } = result.value;
        accumulatedFindings.push(...findings);

        if (layer === 1) hasLayer1Complete = true;
        if (layer === 3) hasLayer3Complete = true;

        const currentPct = hasLayer1Complete && hasLayer3Complete ? 66 : 33;
        yield {
          status: 'scanning',
          stage: `Layer ${layer} (${name}) analysis complete`,
          percentage: currentPct,
          currentEngine: name,
          findings: [...accumulatedFindings],
        };
      } else {
        const errorMessage =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        yield {
          status: 'scanning',
          stage: 'Engine analysis failure',
          percentage: 33,
          findings: [...accumulatedFindings],
          error: {
            message: `Engine execution failed: ${errorMessage}`,
          },
        };
      }

      if (this.isAborted) return;
    }

    // 3. Layer 2 (LLM) Analysis for Ambiguous Findings
    const ambiguousFindings = accumulatedFindings.filter(
      (f) => f.confidence !== 'high'
    ) as AmbiguousFinding[];

    if (layer2Engine && ambiguousFindings.length > 0) {
      yield {
        status: 'scanning',
        stage: 'Dispatching ambiguous findings to Layer 2 LLM Engine',
        percentage: 75,
        currentEngine: layer2Engine.name,
        findings: [...accumulatedFindings],
      };

      try {
        const promptContexts = prepareForLLM(ambiguousFindings, text);
        const llmInput: EngineInput = {
          text,
          lines,
          options: { promptContexts, ambiguousFindings },
        };

        const llmFindings = await layer2Engine.analyze(llmInput);
        accumulatedFindings.push(...llmFindings);

        yield {
          status: 'scanning',
          stage: 'Layer 2 (LLM) analysis complete',
          percentage: 90,
          currentEngine: layer2Engine.name,
          findings: [...accumulatedFindings],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        yield {
          status: 'scanning',
          stage: 'Layer 2 LLM analysis failed',
          percentage: 90,
          findings: [...accumulatedFindings],
          error: {
            message: `Layer 2 LLM Engine failed: ${message}`,
            failedLayer: 'Layer 2 (LLM)',
          },
        };
      }
    } else {
      yield {
        status: 'scanning',
        stage: 'Layer 2 LLM analysis skipped (no ambiguous findings or LLM unavailable)',
        percentage: 90,
        findings: [...accumulatedFindings],
      };
    }

    if (this.isAborted) return;

    // 4. Final Aggregation & Scoring
    const aggregated = this.aggregator.aggregate(accumulatedFindings);
    const finalScored = this.scorer.score(aggregated);

    yield {
      status: 'complete',
      stage: 'Scan complete',
      percentage: 100,
      findings: finalScored,
    };
  }
}
