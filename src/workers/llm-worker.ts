/**
 * LLM Web Worker — in-browser inference via @mlc-ai/web-llm.
 *
 * All direct @mlc-ai/web-llm usage is confined to this worker module.
 * Main-thread code must communicate only through the typed WorkerMessage protocol.
 *
 * Vite entry:
 *   new Worker(new URL('./llm-worker.ts', import.meta.url), { type: 'module' })
 */

import {
  CreateMLCEngine as defaultCreateMLCEngine,
  type InitProgressReport,
  type MLCEngineConfig,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import type { AmbiguousFinding, LLMAnalysisResult, LLMVerdict } from '@/types/llm-types';
import type { Finding, ConfidenceLevel } from '@/types/finding';
import type {
  AnalyzeMessage,
  InitModelMessage,
  WorkerMessage,
} from '@/types/worker-messages';
import { ErrorCode } from '@/types/scan';
import { buildSystemPrompt, buildUserPrompt } from './prompt-template';

/** Default per-inference timeout (ms) for Promise.race wrapper */
export const DEFAULT_INFERENCE_TIMEOUT_MS = 30_000;

/** Injectable CreateMLCEngine signature for tests */
export type CreateMLCEngineFn = (
  modelId: string | string[],
  engineConfig?: MLCEngineConfig,
  chatOpts?: unknown
) => Promise<MLCEngineInterface>;

export interface LlmWorkerDependencies {
  /** Factory for the web-llm engine — defaults to CreateMLCEngine */
  readonly createEngine?: CreateMLCEngineFn;
  /** Outbound message sink — defaults to self.postMessage */
  readonly postMessage?: (message: WorkerMessage) => void;
  /** Per-inference timeout in milliseconds */
  readonly inferenceTimeoutMs?: number;
}

interface ParsedLlmJson {
  readonly verdict?: unknown;
  readonly confidence?: unknown;
  readonly reasoning?: unknown;
}

const VALID_VERDICTS: readonly LLMVerdict[] = ['real_secret', 'false_positive', 'uncertain'];

function isLlmVerdict(value: unknown): value is LLMVerdict {
  return typeof value === 'string' && (VALID_VERDICTS as readonly string[]).includes(value);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mapConfidence(verdict: LLMVerdict, modelConfidence: number): ConfidenceLevel {
  if (verdict === 'real_secret') {
    return modelConfidence >= 0.7 ? 'high' : 'medium';
  }
  if (verdict === 'false_positive') {
    return 'low';
  }
  return 'medium';
}

function toFinding(finding: AmbiguousFinding, result: LLMAnalysisResult): Finding {
  return {
    id: finding.id,
    secretType: finding.secretType,
    lineNumber: finding.lineNumber,
    columnStart: finding.columnStart,
    columnEnd: finding.columnEnd,
    confidence: mapConfidence(result.verdict, result.confidence),
    detectionLayer: 3,
    maskedValue: finding.maskedValue,
    context: finding.context,
  };
}

function parseLlmContent(findingId: string, content: string): LLMAnalysisResult {
  try {
    const parsed = JSON.parse(content) as ParsedLlmJson;
    const verdict: LLMVerdict = isLlmVerdict(parsed.verdict) ? parsed.verdict : 'uncertain';
    const confidence = clampConfidence(parsed.confidence);
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined;
    return { findingId, verdict, confidence, reasoning };
  } catch {
    return {
      findingId,
      verdict: 'uncertain',
      confidence: 0.5,
      reasoning: 'Malformed LLM JSON response',
    };
  }
}

function classifyInitError(error: unknown): ErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  if (/webgpu|gpu|adapter|device lost/i.test(message)) {
    return ErrorCode.WEBGPU_INIT_FAILED;
  }
  return ErrorCode.MODEL_LOAD_FAILED;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error(timeoutMessage), { code: ErrorCode.INFERENCE_TIMEOUT }));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
}

/**
 * Creates an injectable LLM worker controller for unit tests and the real Worker entrypoint.
 */
export function createLlmWorkerController(deps: LlmWorkerDependencies = {}) {
  const createEngine = deps.createEngine ?? defaultCreateMLCEngine;
  const postMessage =
    deps.postMessage ??
    ((message: WorkerMessage) => {
      self.postMessage(message);
    });
  const inferenceTimeoutMs = deps.inferenceTimeoutMs ?? DEFAULT_INFERENCE_TIMEOUT_MS;

  let engine: MLCEngineInterface | null = null;
  let initInProgress = false;
  let analyzeChain: Promise<void> = Promise.resolve();

  function emitError(code: ErrorCode, message: string, details?: unknown): void {
    const errorMsg: WorkerMessage = {
      type: 'ERROR',
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    };
    postMessage(errorMsg);
  }

  async function handleInitModel(msg: InitModelMessage): Promise<void> {
    if (initInProgress) {
      emitError(
        ErrorCode.WORKER_INITIALIZATION_FAILED,
        'INIT_MODEL already in progress — wait for MODEL_READY before re-initializing.'
      );
      return;
    }

    initInProgress = true;
    engine = null;

    try {
      const engineConfig: MLCEngineConfig = {
        initProgressCallback: (report: InitProgressReport) => {
          const progressMsg: WorkerMessage = {
            type: 'MODEL_PROGRESS',
            progress: report.progress,
            text: report.text,
          };
          postMessage(progressMsg);
        },
      };

      engine = await createEngine(msg.modelId, engineConfig);

      const readyMsg: WorkerMessage = {
        type: 'MODEL_READY',
        capabilities: { webgpu: true, llm: true },
      };
      postMessage(readyMsg);
    } catch (error) {
      engine = null;
      emitError(
        classifyInitError(error),
        error instanceof Error
          ? `Model initialization failed: ${error.message}`
          : 'Model initialization failed for an unknown reason.',
        error
      );
    } finally {
      initInProgress = false;
    }
  }

  async function runInference(finding: AmbiguousFinding): Promise<LLMAnalysisResult> {
    if (!engine) {
      throw Object.assign(new Error('ANALYZE received before INIT_MODEL completed.'), {
        code: ErrorCode.WORKER_INITIALIZATION_FAILED,
      });
    }

    const completionPromise = engine.chat.completions.create({
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(finding) },
      ],
      response_format: { type: 'json_object' },
      stream: false,
    });

    const completion = await withTimeout(
      completionPromise,
      inferenceTimeoutMs,
      `Inference timed out after ${inferenceTimeoutMs}ms for finding ${finding.id}`
    );

    const content = completion.choices[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return {
        findingId: finding.id,
        verdict: 'uncertain',
        confidence: 0.5,
        reasoning: 'Empty LLM response',
      };
    }

    return parseLlmContent(finding.id, content);
  }

  async function handleAnalyze(msg: AnalyzeMessage): Promise<void> {
    if (!engine) {
      emitError(
        ErrorCode.WORKER_INITIALIZATION_FAILED,
        'ANALYZE received before INIT_MODEL completed. Initialize the model first.'
      );
      return;
    }

    if (initInProgress) {
      emitError(
        ErrorCode.WORKER_INITIALIZATION_FAILED,
        'ANALYZE received while INIT_MODEL is still in progress.'
      );
      return;
    }

    try {
      const analysisResults: LLMAnalysisResult[] = [];
      const findings: Finding[] = [];

      for (const finding of msg.findings) {
        try {
          const result = await runInference(finding);
          analysisResults.push(result);
          findings.push(toFinding(finding, result));
        } catch (error) {
          const code =
            error && typeof error === 'object' && 'code' in error
              ? (error as { code?: ErrorCode }).code
              : undefined;

          if (code === ErrorCode.INFERENCE_TIMEOUT) {
            emitError(
              ErrorCode.INFERENCE_TIMEOUT,
              error instanceof Error ? error.message : 'Inference timed out.',
              { findingId: finding.id }
            );
            return;
          }

          emitError(
            ErrorCode.INFERENCE_FAILED,
            error instanceof Error
              ? `Inference failed: ${error.message}`
              : 'Inference failed for an unknown reason.',
            { findingId: finding.id, error }
          );
          return;
        }
      }

      const resultMsg: WorkerMessage = {
        type: 'RESULT',
        findings,
        analysisResults,
      };
      postMessage(resultMsg);
    } catch (error) {
      emitError(
        ErrorCode.INFERENCE_FAILED,
        error instanceof Error
          ? `ANALYZE batch failed: ${error.message}`
          : 'ANALYZE batch failed for an unknown reason.',
        error
      );
    }
  }

  async function onMessage(event: MessageEvent<WorkerMessage>): Promise<void> {
    const msg = event.data;

    switch (msg.type) {
      case 'INIT_MODEL':
        await handleInitModel(msg);
        break;
      case 'ANALYZE': {
        // Process ANALYZE messages sequentially to avoid GPU contention.
        const run = analyzeChain.then(() => handleAnalyze(msg));
        analyzeChain = run.then(
          () => undefined,
          () => undefined
        );
        await run;
        break;
      }
      case 'MODEL_PROGRESS':
      case 'MODEL_READY':
      case 'RESULT':
      case 'ERROR':
        emitError(
          ErrorCode.UNKNOWN_ERROR,
          `llm-worker: unexpected inbound message type: ${msg.type}`
        );
        break;
      default:
        emitError(
          ErrorCode.UNKNOWN_ERROR,
          `llm-worker: unrecognised message type received: ${(msg as { type: string }).type}`
        );
    }
  }

  function onError(event: ErrorEvent): void {
    emitError(ErrorCode.UNKNOWN_ERROR, event.message || 'Uncaught error in LLM Web Worker', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }

  return {
    onMessage,
    onError,
    handleInitModel,
    handleAnalyze,
  };
}

type WorkerGlobalScopeCtor = new () => unknown;

const workerGlobalScopeCtor = (globalThis as { WorkerGlobalScope?: WorkerGlobalScopeCtor })
  .WorkerGlobalScope;

const isWorkerRuntime =
  typeof self !== 'undefined' &&
  typeof workerGlobalScopeCtor === 'function' &&
  self instanceof workerGlobalScopeCtor;

if (isWorkerRuntime) {
  const controller = createLlmWorkerController();
  self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    void controller.onMessage(event);
  };
  self.onerror = (event: string | Event) => {
    if (typeof event === 'string') {
      controller.onError({ message: event } as ErrorEvent);
      return true;
    }
    controller.onError(event as ErrorEvent);
    return true;
  };
}
