import type { IDetectionEngine } from './types';
import type { DetectionLayer, EngineInput, Finding } from '@/types';
import type { AmbiguousFinding } from '@/types/llm-types';
import type { ModelLifecycleState } from '@/types/model-lifecycle';
import type {
  AnalyzeMessage,
  InitModelMessage,
  ModelProgressMessage,
  WorkerMessage,
} from '@/types/worker-messages';

/** Default inference timeout for analyze() Promise.race (ms). */
export const LLM_ANALYZE_TIMEOUT_MS = 30_000;

export type WorkerFactory = () => Worker;

export type ModelProgressCallback = (progress: number, text: string) => void;

export interface LLMAnalyzerOptions {
  /** Factory that creates the LLM Web Worker (DI for tests). */
  readonly workerFactory?: WorkerFactory;
  /** Forwarded MODEL_PROGRESS events for UI hooks. */
  readonly onProgress?: ModelProgressCallback;
  /** Injectable WebGPU probe — defaults to navigator.gpu presence. */
  readonly isWebGPUSupported?: () => boolean;
  /** Override analyze timeout (ms); defaults to 30s. */
  readonly analyzeTimeoutMs?: number;
}

interface LLMPromptContextLike {
  readonly finding: AmbiguousFinding;
  readonly surroundingContext: string;
}

/**
 * Layer 2 LLM Contextual Analyzer — main-thread facade over the LLM Web Worker.
 * Implements IDetectionEngine; never imports @mlc-ai/web-llm directly.
 */
export class LLMAnalyzer implements IDetectionEngine {
  public readonly name = 'LLM Contextual Analyzer';
  public readonly layer: DetectionLayer = 2;

  private readonly workerFactory: WorkerFactory;
  private readonly onProgress?: ModelProgressCallback;
  private readonly isWebGPUSupported: () => boolean;
  private readonly analyzeTimeoutMs: number;

  private worker: Worker | null = null;
  private workerReady = false;
  private modelStatus: ModelLifecycleState = 'idle';
  private webgpuSupported = false;

  private initPromise: Promise<void> | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((reason?: unknown) => void) | null = null;

  private analyzePromise: Promise<Finding[]> | null = null;
  private analyzeResolve: ((findings: Finding[]) => void) | null = null;
  private analyzeReject: ((reason?: unknown) => void) | null = null;
  private pendingOriginalFindings: Finding[] = [];

  constructor(options: LLMAnalyzerOptions = {}) {
    this.workerFactory =
      options.workerFactory ??
      (() =>
        new Worker(new URL('../workers/llm-worker.ts', import.meta.url), {
          type: 'module',
        }));
    this.onProgress = options.onProgress;
    this.isWebGPUSupported =
      options.isWebGPUSupported ??
      (() => typeof navigator !== 'undefined' && 'gpu' in navigator);
    this.analyzeTimeoutMs = options.analyzeTimeoutMs ?? LLM_ANALYZE_TIMEOUT_MS;
    this.webgpuSupported = this.isWebGPUSupported();
    this.spawnWorker();
  }

  private spawnWorker(): void {
    try {
      this.worker = this.workerFactory();
      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(event.data);
      };
      this.worker.onerror = (event: ErrorEvent) => {
        console.error('[LLMAnalyzer] Worker error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
        });
        this.workerReady = false;
        this.modelStatus = 'error';
        const err = new Error(event.message || 'LLM worker crashed');
        if (this.initReject) {
          this.initReject(err);
          this.clearInitHandlers();
        }
        if (this.analyzeReject) {
          this.analyzeReject(err);
          this.clearAnalyzeHandlers();
        }
      };
      this.workerReady = true;
    } catch (error) {
      console.error('[LLMAnalyzer] Failed to spawn worker', error);
      this.worker = null;
      this.workerReady = false;
      this.modelStatus = 'error';
    }
  }

  private handleWorkerMessage(message: WorkerMessage): void {
    switch (message.type) {
      case 'MODEL_PROGRESS':
        this.onModelProgress(message);
        break;
      case 'MODEL_READY':
        this.modelStatus = 'ready';
        this.workerReady = true;
        if (this.initResolve) {
          this.initResolve();
          this.clearInitHandlers();
        }
        break;
      case 'RESULT':
        if (this.analyzeResolve) {
          this.analyzeResolve([...message.findings]);
          this.clearAnalyzeHandlers();
        }
        break;
      case 'ERROR':
        this.modelStatus = 'error';
        if (this.initReject) {
          this.initReject(new Error(message.message));
          this.clearInitHandlers();
        }
        if (this.analyzeResolve) {
          // analyze() never throws — return originals unchanged on worker ERROR mid-flight
          console.warn('[LLMAnalyzer] Worker ERROR during analyze; returning original findings', {
            code: message.code,
            message: message.message,
          });
          this.analyzeResolve([...this.pendingOriginalFindings]);
          this.clearAnalyzeHandlers();
        }
        break;
      default:
        break;
    }
  }

  private onModelProgress(message: ModelProgressMessage): void {
    if (this.modelStatus === 'idle' || this.modelStatus === 'checking-webgpu') {
      this.modelStatus = 'downloading';
    }
    this.onProgress?.(message.progress, message.text);
  }

  private clearInitHandlers(): void {
    this.initResolve = null;
    this.initReject = null;
    this.initPromise = null;
  }

  private clearAnalyzeHandlers(): void {
    this.analyzeResolve = null;
    this.analyzeReject = null;
    this.analyzePromise = null;
    this.pendingOriginalFindings = [];
  }

  /**
   * Sends INIT_MODEL to the worker. Idempotent while a prior init is in-flight.
   */
  public initializeModel(modelId: string, _version?: string): Promise<void> {
    if (this.modelStatus === 'ready' && this.workerReady) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    if (!this.worker || !this.workerReady) {
      return Promise.reject(new Error('LLM worker is not available'));
    }

    this.webgpuSupported = this.isWebGPUSupported();
    if (!this.webgpuSupported) {
      this.modelStatus = 'degraded';
      return Promise.reject(new Error('WebGPU is not supported in this environment'));
    }

    this.modelStatus = 'checking-webgpu';
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });

    const message: InitModelMessage = { type: 'INIT_MODEL', modelId };
    try {
      this.worker.postMessage(message);
    } catch (error) {
      this.modelStatus = 'error';
      this.clearInitHandlers();
      return Promise.reject(error);
    }

    return this.initPromise;
  }

  public isAvailable(): boolean {
    this.webgpuSupported = this.isWebGPUSupported();
    return this.webgpuSupported && this.workerReady && this.modelStatus === 'ready';
  }

  public getModelStatus(): ModelLifecycleState {
    return this.modelStatus;
  }

  /**
   * Analyzes ambiguous findings via the worker. Never throws.
   * Returns [] when unavailable; originals unchanged on timeout.
   */
  public async analyze(input: EngineInput): Promise<Finding[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const ambiguous = this.extractAmbiguousFindings(input);
    if (ambiguous.length === 0) {
      return [];
    }

    if (this.analyzePromise) {
      // GPU cannot handle concurrent inference — queue by awaiting the in-flight call first.
      try {
        await this.analyzePromise;
      } catch {
        // prior call failed; continue with this request
      }
      if (!this.isAvailable()) {
        return [];
      }
    }

    const originals: Finding[] = ambiguous.map((f) => this.stripAmbiguous(f));
    this.pendingOriginalFindings = originals;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<Finding[]>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(
          `[LLMAnalyzer] analyze() timed out after ${this.analyzeTimeoutMs}ms; returning original findings unchanged`
        );
        resolve([...originals]);
      }, this.analyzeTimeoutMs);
    });

    this.analyzePromise = new Promise<Finding[]>((resolve, reject) => {
      this.analyzeResolve = resolve;
      this.analyzeReject = reject;
    });

    const message: AnalyzeMessage = { type: 'ANALYZE', findings: ambiguous };
    try {
      this.worker!.postMessage(message);
    } catch (error) {
      console.error('[LLMAnalyzer] postMessage failed during analyze', error);
      this.clearAnalyzeHandlers();
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      return [];
    }

    try {
      const result = await Promise.race([this.analyzePromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('[LLMAnalyzer] analyze failed', error);
      return [...originals];
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      this.clearAnalyzeHandlers();
    }
  }

  private extractAmbiguousFindings(input: EngineInput): AmbiguousFinding[] {
    const options = input.options ?? {};
    const raw = options.ambiguousFindings;
    if (!Array.isArray(raw) || raw.length === 0) {
      return [];
    }

    const promptContexts = Array.isArray(options.promptContexts)
      ? (options.promptContexts as LLMPromptContextLike[])
      : [];

    return raw.map((finding: AmbiguousFinding) => {
      if (finding.contextLines && finding.contextLines.length > 0) {
        return finding;
      }
      const ctx = promptContexts.find((p) => p.finding?.id === finding.id);
      if (ctx?.surroundingContext) {
        return {
          ...finding,
          contextLines: ctx.surroundingContext.split('\n'),
        };
      }
      return {
        ...finding,
        contextLines: finding.context ? [finding.context] : [],
      };
    });
  }

  private stripAmbiguous(finding: AmbiguousFinding): Finding {
    return {
      id: finding.id,
      secretType: finding.secretType,
      lineNumber: finding.lineNumber,
      columnStart: finding.columnStart,
      columnEnd: finding.columnEnd,
      confidence: finding.confidence,
      detectionLayer: finding.detectionLayer,
      maskedValue: finding.maskedValue,
      context: finding.context,
    };
  }

  /** Terminates the worker and resets internal state. Safe to call multiple times. */
  public terminate(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore double-terminate
      }
    }
    this.worker = null;
    this.workerReady = false;
    this.modelStatus = 'idle';
    if (this.initReject) {
      this.initReject(new Error('LLMAnalyzer terminated'));
    }
    this.clearInitHandlers();
    if (this.analyzeResolve) {
      this.analyzeResolve([...this.pendingOriginalFindings]);
    }
    this.clearAnalyzeHandlers();
  }
}
