import type { Finding } from './finding';
import type { AmbiguousFinding, LLMAnalysisResult } from './llm-types';
import { ErrorCode } from './scan';

/**
 * ErrorCode for worker ERROR messages is defined in `./scan` and includes
 * LLM-specific codes: WEBGPU_INIT_FAILED, INFERENCE_FAILED, INFERENCE_TIMEOUT.
 */
export type WorkerErrorCode = ErrorCode;

/** Message variant to initialize quantized LLM model in Web Worker */
export interface InitModelMessage {
  readonly type: 'INIT_MODEL';
  readonly modelId: string;
}

/** Message variant reporting LLM model download/load progress */
export interface ModelProgressMessage {
  readonly type: 'MODEL_PROGRESS';
  readonly progress: number;
  readonly text: string;
}

/** Message variant notifying that LLM Web Worker model is ready */
export interface ModelReadyMessage {
  readonly type: 'MODEL_READY';
  readonly capabilities?: Record<string, boolean>;
}

/**
 * Message variant dispatching ambiguous findings (with context lines) for LLM analysis.
 */
export interface AnalyzeMessage {
  readonly type: 'ANALYZE';
  readonly findings: readonly AmbiguousFinding[];
}

/** Message variant returning LLM analysis result findings */
export interface ResultMessage {
  readonly type: 'RESULT';
  readonly findings: readonly Finding[];
  readonly analysisResults: readonly LLMAnalysisResult[];
}

/** Message variant returning error from Web Worker */
export interface ErrorMessage {
  readonly type: 'ERROR';
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * Discriminated union of all Web Worker communication message variants.
 */
export type WorkerMessage =
  | InitModelMessage
  | ModelProgressMessage
  | ModelReadyMessage
  | AnalyzeMessage
  | ResultMessage
  | ErrorMessage;

/**
 * Type guard for WorkerMessage discriminated union.
 */
export function isWorkerMessage(msg: unknown): msg is WorkerMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const candidate = msg as { type?: unknown };
  return (
    typeof candidate.type === 'string' &&
    ['INIT_MODEL', 'MODEL_PROGRESS', 'MODEL_READY', 'ANALYZE', 'RESULT', 'ERROR'].includes(
      candidate.type
    )
  );
}

/** Type guard for InitModelMessage */
export function isInitModelMessage(msg: unknown): msg is InitModelMessage {
  return isWorkerMessage(msg) && msg.type === 'INIT_MODEL';
}

/** Type guard for ModelProgressMessage */
export function isModelProgressMessage(msg: unknown): msg is ModelProgressMessage {
  return isWorkerMessage(msg) && msg.type === 'MODEL_PROGRESS';
}

/** Type guard for ModelReadyMessage */
export function isModelReadyMessage(msg: unknown): msg is ModelReadyMessage {
  return isWorkerMessage(msg) && msg.type === 'MODEL_READY';
}

/** Type guard for AnalyzeMessage */
export function isAnalyzeMessage(msg: unknown): msg is AnalyzeMessage {
  return isWorkerMessage(msg) && msg.type === 'ANALYZE';
}

/** Type guard for ResultMessage */
export function isResultMessage(msg: unknown): msg is ResultMessage {
  return isWorkerMessage(msg) && msg.type === 'RESULT';
}

/** Type guard for ErrorMessage */
export function isErrorMessage(msg: unknown): msg is ErrorMessage {
  return isWorkerMessage(msg) && msg.type === 'ERROR';
}
