import { ErrorCode, REQUIRED_ERROR_CODES } from '@/infra/ErrorCodes';
import {
  AirGapError,
  DetectionLayerError,
  ModelLifecycleError,
  ScanEngineError,
} from '@/types/errors';

export interface ErrorScenarioFixture {
  readonly code: ErrorCode;
  readonly message: string;
  readonly layer: string;
  readonly operation: string;
  readonly error: AirGapError;
}

function scenario(
  code: ErrorCode,
  message: string,
  layer: string,
  operation: string,
  factory: (init: {
    errorCode: ErrorCode;
    message: string;
    layer: string;
    operation: string;
    context: Record<string, unknown>;
  }) => AirGapError
): ErrorScenarioFixture {
  const init = {
    errorCode: code,
    message,
    layer,
    operation,
    context: { fixture: true, code },
  };
  return { code, message, layer, operation, error: factory(init) };
}

/** One fixture per required ErrorCode (WO-047). */
export const ERROR_SCENARIOS: readonly ErrorScenarioFixture[] = [
  scenario(
    ErrorCode.WEBGPU_UNAVAILABLE,
    'WebGPU is not available in this browser',
    'infra',
    'detectWebGPU',
    (i) => new ModelLifecycleError(i)
  ),
  scenario(
    ErrorCode.WEBGPU_ADAPTER_FAILURE,
    'Failed to request a WebGPU adapter',
    'infra',
    'requestAdapter',
    (i) => new ModelLifecycleError(i)
  ),
  scenario(
    ErrorCode.MODEL_DOWNLOAD_FAILED,
    'Model download failed after retries',
    'infra',
    'downloadModel',
    (i) => new ModelLifecycleError(i)
  ),
  scenario(
    ErrorCode.MODEL_HASH_MISMATCH,
    'Model SHA-256 did not match manifest',
    'infra',
    'verifyModelHash',
    (i) => new ModelLifecycleError(i)
  ),
  scenario(
    ErrorCode.MODEL_CACHE_CORRUPT,
    'IndexedDB model cache entry is corrupt',
    'infra',
    'readModelCache',
    (i) => new ModelLifecycleError(i)
  ),
  scenario(
    ErrorCode.LLM_WORKER_CRASH,
    'LLM worker terminated unexpectedly',
    'llm',
    'worker.onerror',
    (i) => new DetectionLayerError({ ...i, layer: 'llm' })
  ),
  scenario(
    ErrorCode.LLM_INFERENCE_TIMEOUT,
    'LLM inference exceeded timeout',
    'llm',
    'analyzeChunk',
    (i) => new DetectionLayerError({ ...i, layer: 'llm' })
  ),
  scenario(
    ErrorCode.REGEX_ENGINE_ERROR,
    'Regex engine failed while compiling patterns',
    'regex',
    'scanLine',
    (i) => new DetectionLayerError({ ...i, layer: 'regex' })
  ),
  scenario(
    ErrorCode.ENTROPY_ENGINE_ERROR,
    'Entropy analyzer failed on token window',
    'entropy',
    'analyzeTokens',
    (i) => new DetectionLayerError({ ...i, layer: 'entropy' })
  ),
  scenario(
    ErrorCode.SCAN_ABORTED,
    'Scan aborted by user',
    'orchestrator',
    'abort',
    (i) => new ScanEngineError(i)
  ),
  scenario(
    ErrorCode.INPUT_TOO_LARGE,
    'Input exceeds maximum allowed size',
    'orchestrator',
    'validateInput',
    (i) => new ScanEngineError(i)
  ),
  scenario(
    ErrorCode.MEMORY_PRESSURE,
    'Browser reported memory pressure during scan',
    'orchestrator',
    'guardMemory',
    (i) => new ScanEngineError(i)
  ),
  scenario(
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred',
    'infra',
    'unknown',
    (i) => new AirGapError(i)
  ),
];

export function getScenario(code: ErrorCode): ErrorScenarioFixture {
  const found = ERROR_SCENARIOS.find((s) => s.code === code);
  if (!found) {
    throw new Error(`Missing fixture for ErrorCode ${code}`);
  }
  return found;
}

export { REQUIRED_ERROR_CODES };
