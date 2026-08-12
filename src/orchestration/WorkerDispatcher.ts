import { Finding } from '@/types';
import { Logger } from '@/infra/logger';
import { RegexEngine } from '@/engines/RegexEngine';
import { EntropyAnalyzer } from '@/engines/EntropyAnalyzer';
import {
  COMPUTATION_WORKER_THRESHOLD,
  type ComputationWorkerRequest,
  type ComputationWorkerResponse,
  type ProgressWorkerResponse,
} from '@/workers/computation-worker-types';

export type WorkerFactory = () => Worker;

export interface WorkerAnalyzeOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: ProgressWorkerResponse) => void;
  /** Force main-thread path (tests / unavailable workers). */
  readonly forceMainThread?: boolean;
}

export interface WorkerAnalyzeResult {
  readonly findings: Finding[];
  readonly usedWorker: boolean;
  readonly fellBackToMainThread: boolean;
  readonly progressEvents: ProgressWorkerResponse[];
}

export interface WorkerDispatcherOptions {
  readonly threshold?: number;
  readonly workerFactory?: WorkerFactory;
  readonly regexEngine?: RegexEngine;
  readonly entropyEngine?: EntropyAnalyzer;
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL('../workers/computation.worker.ts', import.meta.url), {
    type: 'module',
  });
}

/**
 * Dispatches large-input regex/entropy scanning to a computation Web Worker (WO-053).
 */
export class WorkerDispatcher {
  public threshold: number;
  private readonly workerFactory: WorkerFactory;
  private readonly hasCustomFactory: boolean;
  private readonly regexEngine: RegexEngine;
  private readonly entropyEngine: EntropyAnalyzer;
  private worker: Worker | null = null;
  private workerFailed = false;
  private activeRequestId: string | null = null;
  private pendingReject: ((reason?: unknown) => void) | null = null;

  constructor(options?: WorkerDispatcherOptions) {
    this.threshold = options?.threshold ?? COMPUTATION_WORKER_THRESHOLD;
    this.hasCustomFactory = Boolean(options?.workerFactory);
    this.workerFactory = options?.workerFactory ?? defaultWorkerFactory;
    this.regexEngine = options?.regexEngine ?? new RegexEngine();
    this.entropyEngine = options?.entropyEngine ?? new EntropyAnalyzer();
  }

  /** Strictly greater than threshold → worker path. */
  public shouldUseWorker(input: string): boolean {
    return input.length > this.threshold;
  }

  public isWorkerAvailable(): boolean {
    if (this.workerFailed) return false;
    // Injectable factories work in Vitest/jsdom where Worker may be missing.
    if (this.hasCustomFactory) return true;
    return typeof Worker !== 'undefined';
  }

  public initialize(): void {
    if (!this.isWorkerAvailable() || this.worker) return;
    try {
      this.worker = this.createWorker();
    } catch (err) {
      this.workerFailed = true;
      Logger.warn('Computation worker failed to initialize; using main thread', {
        layer: 'orchestrator',
        operation: 'WorkerDispatcher.initialize',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  public abort(): void {
    const requestId = this.activeRequestId;
    this.activeRequestId = null;
    if (this.worker && requestId) {
      const msg: ComputationWorkerRequest = { type: 'ABORT', requestId };
      try {
        this.worker.postMessage(msg);
      } catch {
        // ignore
      }
    }
    if (this.pendingReject) {
      this.pendingReject(new DOMException('Aborted', 'AbortError'));
      this.pendingReject = null;
    }
  }

  public terminate(): void {
    this.abort();
    this.worker?.terminate();
    this.worker = null;
  }

  public async analyze(
    input: string,
    options?: WorkerAnalyzeOptions
  ): Promise<WorkerAnalyzeResult> {
    const trimmedEmpty = !input || input.trim().length === 0;
    if (trimmedEmpty) {
      return {
        findings: [],
        usedWorker: false,
        fellBackToMainThread: false,
        progressEvents: [],
      };
    }

    const useWorker =
      !options?.forceMainThread &&
      this.shouldUseWorker(input) &&
      this.isWorkerAvailable();

    if (!useWorker) {
      const findings = await this.runMainThread(input, options?.signal);
      return {
        findings,
        usedWorker: false,
        fellBackToMainThread: false,
        progressEvents: [],
      };
    }

    this.initialize();
    if (!this.worker) {
      const findings = await this.runMainThread(input, options?.signal);
      return {
        findings,
        usedWorker: false,
        fellBackToMainThread: true,
        progressEvents: [],
      };
    }

    try {
      return await this.runWorker(input, options);
    } catch (err) {
      if (options?.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        throw err;
      }
      Logger.error('Computation worker failed; falling back to main thread', err, {
        layer: 'orchestrator',
        operation: 'WorkerDispatcher.analyze',
        inputSize: input.length,
      });
      this.workerFailed = true;
      const findings = await this.runMainThread(input, options?.signal);
      return {
        findings,
        usedWorker: false,
        fellBackToMainThread: true,
        progressEvents: [],
      };
    }
  }

  private createWorker(): Worker {
    const worker = this.workerFactory();
    worker.onerror = (event) => {
      Logger.error(
        'Computation worker onerror',
        new Error(event.message || 'Worker crashed'),
        {
          layer: 'orchestrator',
          operation: 'WorkerDispatcher.onerror',
        }
      );
      this.workerFailed = true;
      if (this.pendingReject) {
        this.pendingReject(new Error(event.message || 'Worker crashed'));
        this.pendingReject = null;
      }
    };
    return worker;
  }

  private async runMainThread(input: string, signal?: AbortSignal): Promise<Finding[]> {
    const lines = input.split('\n');
    const engineInput = { text: input, lines, signal };
    const [regexFindings, entropyFindings] = await Promise.all([
      this.regexEngine.analyze(engineInput),
      this.entropyEngine.analyze(engineInput),
    ]);
    return [...regexFindings, ...entropyFindings];
  }

  private runWorker(
    input: string,
    options?: WorkerAnalyzeOptions
  ): Promise<WorkerAnalyzeResult> {
    const worker = this.worker;
    if (!worker) {
      return Promise.reject(new Error('Worker not initialized'));
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.activeRequestId = requestId;
    const progressEvents: ProgressWorkerResponse[] = [];
    const lines = input.split('\n');

    return new Promise<WorkerAnalyzeResult>((resolve, reject) => {
      this.pendingReject = reject;

      const onAbort = () => {
        this.abort();
      };
      options?.signal?.addEventListener('abort', onAbort, { once: true });

      const handleMessage = (event: MessageEvent<ComputationWorkerResponse>) => {
        const data = event.data;
        if (!data || data.requestId !== requestId) return;

        if (data.type === 'PROGRESS') {
          progressEvents.push(data);
          options?.onProgress?.(data);
          return;
        }

        if (data.type === 'ERROR') {
          cleanup();
          reject(new Error(data.message));
          return;
        }

        if (data.type === 'RESULT') {
          cleanup();
          resolve({
            findings: data.findings,
            usedWorker: true,
            fellBackToMainThread: false,
            progressEvents,
          });
        }
      };

      const cleanup = () => {
        worker.removeEventListener('message', handleMessage as EventListener);
        options?.signal?.removeEventListener('abort', onAbort);
        if (this.activeRequestId === requestId) this.activeRequestId = null;
        this.pendingReject = null;
      };

      worker.addEventListener('message', handleMessage as EventListener);

      const msg: ComputationWorkerRequest = {
        type: 'ANALYZE',
        requestId,
        text: input,
        lines,
      };
      try {
        worker.postMessage(msg);
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }
}

export { COMPUTATION_WORKER_THRESHOLD };
