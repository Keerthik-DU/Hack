import { ErrorCode } from '@/infra/ErrorCodes';

export type ErrorLayer =
  | 'regex'
  | 'entropy'
  | 'llm'
  | 'orchestrator'
  | 'infra'
  | string;

export interface AirGapErrorInit {
  readonly errorCode: ErrorCode | string;
  readonly message: string;
  readonly layer?: ErrorLayer;
  readonly operation?: string;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
}

/**
 * Base typed error for AirGap Scanner (WO-047).
 * Compatible with the structural AirGapError shape used by the scan pipeline.
 */
export class AirGapError extends Error {
  readonly errorCode: ErrorCode | string;
  readonly code: ErrorCode | string;
  readonly layer?: ErrorLayer;
  readonly operation?: string;
  readonly context: Record<string, unknown>;
  readonly cause?: unknown;
  readonly timestamp: number;
  readonly isAirGapError = true as const;

  constructor(init: AirGapErrorInit) {
    super(init.message);
    this.name = 'AirGapError';
    this.errorCode = init.errorCode;
    this.code = init.errorCode;
    this.layer = init.layer;
    this.operation = init.operation;
    this.context = init.context ?? {};
    this.cause = init.cause;
    this.timestamp = Date.now();
  }
}

export class ScanEngineError extends AirGapError {
  constructor(init: AirGapErrorInit) {
    super(init);
    this.name = 'ScanEngineError';
  }
}

export class ModelLifecycleError extends AirGapError {
  constructor(init: AirGapErrorInit) {
    super({ ...init, layer: init.layer ?? 'infra' });
    this.name = 'ModelLifecycleError';
  }
}

export class DetectionLayerError extends AirGapError {
  constructor(init: AirGapErrorInit & { readonly layer: ErrorLayer }) {
    super(init);
    this.name = 'DetectionLayerError';
  }
}
