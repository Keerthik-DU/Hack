import { AirGapError, DetectionLayerName, ErrorCode } from '@/types/scan';

export type { AirGapError };

export interface AirGapErrorOptions {
  readonly code: ErrorCode;
  readonly message: string;
  readonly layer?: DetectionLayerName;
  readonly cause?: unknown;
}

function toAirGapError(name: string, options: AirGapErrorOptions): AirGapError & Error {
  const error = new Error(options.message) as Error & AirGapError;
  error.name = name;
  error.code = options.code;
  error.layer = options.layer;
  error.cause = options.cause;
  error.timestamp = Date.now();
  error.isAirGapError = true;
  return error;
}

/**
 * Per-detection-layer failure (regex / entropy / LLM analyze() isolation).
 */
export function createDetectionLayerError(
  options: AirGapErrorOptions & { readonly layer: DetectionLayerName }
): AirGapError & Error {
  return toAirGapError('DetectionLayerError', options);
}

/**
 * Catastrophic scan-engine failure that escapes per-layer isolation.
 */
export function createScanEngineError(options: AirGapErrorOptions): AirGapError & Error {
  return toAirGapError('ScanEngineError', options);
}

export function isAirGapError(value: unknown): value is AirGapError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as AirGapError).isAirGapError === true &&
    typeof (value as AirGapError).code === 'string' &&
    typeof (value as AirGapError).message === 'string'
  );
}

/**
 * Normalize unknown thrown values into an AirGapError for logging / UI.
 */
export function toAirGapErrorFromUnknown(
  err: unknown,
  fallback: AirGapErrorOptions & { readonly layer: DetectionLayerName }
): AirGapError {
  if (isAirGapError(err)) {
    return err;
  }

  if (err instanceof Error) {
    return createDetectionLayerError({
      code: fallback.code,
      message: err.message || fallback.message,
      layer: fallback.layer,
      cause: err,
    });
  }

  return createDetectionLayerError({
    code: fallback.code,
    message: fallback.message,
    layer: fallback.layer,
    cause: err,
  });
}

/**
 * Production-safe message — never expose stack traces or module paths.
 */
export function sanitizeErrorMessage(error: AirGapError | Error | string): string {
  const raw =
    typeof error === 'string'
      ? error
      : isAirGapError(error)
        ? error.message
        : error.message;

  return raw
    .replace(/[A-Za-z]:\\[^\s]+/g, '[path]')
    .replace(/\/(?:Users|home|var|tmp)\/[^\s]+/g, '[path]')
    .replace(/\s+at\s+.+/g, '')
    .trim()
    .slice(0, 280);
}
