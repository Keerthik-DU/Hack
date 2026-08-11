import { EngineInput } from './detection';
import { Finding } from './finding';

/**
 * Standard error codes across AirGap Scanner detection pipeline and Web Worker layers.
 */
export enum ErrorCode {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_VERIFICATION_FAILED = 'MODEL_VERIFICATION_FAILED',
  WEBGPU_UNAVAILABLE = 'WEBGPU_UNAVAILABLE',
  WORKER_INITIALIZATION_FAILED = 'WORKER_INITIALIZATION_FAILED',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  INPUT_TOO_LARGE = 'INPUT_TOO_LARGE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Real-time progress update yielded during scanning pipeline execution.
 */
export interface ScanProgress {
  /** Current scan stage description */
  readonly stage: string;
  /** Overall scan completion percentage (0..100) */
  readonly percentage: number;
  /** Active detection engine name */
  readonly currentEngine?: string;
  /** Accumulated findings detected so far */
  readonly findings: readonly Finding[];
}

/**
 * Hardware and engine capabilities detected in the current environment.
 */
export interface ScanCapabilities {
  /** Availability of Layer 1 Regex engine */
  readonly regexAvailable: boolean;
  /** Availability of Layer 2 Entropy engine */
  readonly entropyAvailable: boolean;
  /** Availability of Layer 3 WebGPU LLM engine */
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
   * @param input EngineInput containing text to analyze
   * @returns AsyncGenerator of ScanProgress
   */
  scan(input: EngineInput): AsyncGenerator<ScanProgress, void, unknown>;
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
