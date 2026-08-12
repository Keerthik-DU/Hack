import { EngineInput, IDetectionEngine } from './detection';
import { Finding, AmbiguousFinding } from './finding';

/**
 * Standard error codes across AirGap Scanner detection pipeline and Web Worker layers.
 */
export enum ErrorCode {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_VERIFICATION_FAILED = 'MODEL_VERIFICATION_FAILED',
  WEBGPU_UNAVAILABLE = 'WEBGPU_UNAVAILABLE',
  /** WebGPU adapter/device initialization failed inside the LLM worker */
  WEBGPU_INIT_FAILED = 'WEBGPU_INIT_FAILED',
  WORKER_INITIALIZATION_FAILED = 'WORKER_INITIALIZATION_FAILED',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  /** LLM chat-completion inference failed (e.g. VRAM exhaustion) */
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  /** LLM inference exceeded the per-call timeout */
  INFERENCE_TIMEOUT = 'INFERENCE_TIMEOUT',
  INPUT_TOO_LARGE = 'INPUT_TOO_LARGE',
  DETECTION_LAYER_FAILED = 'DETECTION_LAYER_FAILED',
  SCAN_ENGINE_FAILED = 'SCAN_ENGINE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * State machine status of the scanning pipeline.
 */
export type ScanState = 'idle' | 'scanning' | 'complete' | 'error';

/**
 * Status emitted by ScanProgress events.
 */
export type ScanProgressStatus = ScanState | 'aborted';

/**
 * Per-layer runtime status for progressive ResultsPanel indicators (WO-029).
 */
export type LayerRunStatus = 'pending' | 'running' | 'complete' | 'unavailable' | 'error';

/**
 * Named detection layers surfaced in LayerProgress / LayerStatusList UI.
 */
export type DetectionLayerName = 'regex' | 'entropy' | 'llm';

/**
 * Structured error shape shared across orchestration, workers, and UI boundaries.
 */
export interface AirGapError {
  readonly name: string;
  readonly code: ErrorCode;
  readonly message: string;
  readonly layer?: DetectionLayerName;
  readonly cause?: unknown;
  readonly timestamp: number;
  readonly isAirGapError: true;
}

/**
 * Map of detection layer → run status for progressive UI updates.
 */
export type LayerStatusMap = Readonly<Record<DetectionLayerName, LayerRunStatus>>;

/**
 * Per-layer status entry emitted by ScanOrchestrator (WO-044).
 */
export interface LayerStatus {
  readonly layer: DetectionLayerName;
  readonly status: 'pending' | 'complete' | 'error' | 'unavailable';
  readonly error?: AirGapError;
  readonly findings: readonly Finding[];
}

/**
 * Real-time progress update yielded during scanning pipeline execution.
 */
export interface ScanProgress {
  /** Pipeline execution state status */
  readonly status: ScanProgressStatus;
  /** Current scan stage description */
  readonly stage: string;
  /** Overall scan completion percentage (0..100) */
  readonly percentage: number;
  /** Active detection engine name */
  readonly currentEngine?: string;
  /** Accumulated findings detected so far */
  readonly findings: readonly Finding[];
  /**
   * Per-layer status array (WO-044). Prefer this over deriving from stage text.
   * Legacy LayerStatusMap values are still accepted by scan-progress helpers.
   */
  readonly layerStatuses?: readonly LayerStatus[] | LayerStatusMap;
  /** Optional elapsed scan duration in milliseconds */
  readonly scanDurationMs?: number;
  /** Optional error details if stage or pipeline failed */
  readonly error?: {
    readonly message: string;
    readonly failedLayer?: string;
  };
  /** Optional note for aborted scans */
  readonly note?: string;
}

/**
 * Hardware and engine capabilities detected in the current environment.
 */
export interface ScanCapabilities {
  /** Availability of Layer 1 Regex engine */
  readonly regexAvailable: boolean;
  /** Availability of Layer 3 Entropy engine */
  readonly entropyAvailable: boolean;
  /** Availability of Layer 2 WebGPU LLM engine */
  readonly llmAvailable: boolean;
  /** Hardware WebGPU support status */
  readonly webgpuSupported: boolean;
}

/**
 * Pipeline coordinator interface for scanning operation lifecycle.
 */
export interface IScanOrchestrator {
  /**
   * Initiates pipeline scan, yielding progress steps asynchronously.
   * @param input Raw text string or EngineInput containing text to analyze
   * @returns AsyncGenerator yielding ScanProgress events
   */
  scan(input: string | EngineInput): AsyncGenerator<ScanProgress, void, unknown>;

  /**
   * Aborts active scan pipeline execution.
   */
  abort(): void;

  /**
   * Queries active capability matrix.
   * @returns ScanCapabilities
   */
  getCapabilities(): ScanCapabilities;
}

export type { EngineInput, IDetectionEngine, Finding, AmbiguousFinding };
