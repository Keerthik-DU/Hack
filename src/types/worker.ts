/**
 * Backward-compatible re-exports for the LLM Web Worker message protocol.
 * Canonical definitions live in `./worker-messages`.
 */
export {
  isWorkerMessage,
  isInitModelMessage,
  isModelProgressMessage,
  isModelReadyMessage,
  isAnalyzeMessage,
  isResultMessage,
  isErrorMessage,
} from './worker-messages';

export type {
  InitModelMessage,
  ModelProgressMessage,
  ModelReadyMessage,
  AnalyzeMessage,
  ResultMessage,
  ErrorMessage,
  WorkerMessage,
  WorkerErrorCode,
} from './worker-messages';

export { ErrorCode } from './scan';
