/**
 * GPU adapter hardware metadata returned by WebGPU capability detection.
 */
export interface WebGPUAdapterInfo {
  /** GPU vendor name (e.g., 'nvidia', 'amd', 'intel', 'apple') */
  readonly vendor: string;
  /** GPU microarchitecture identifier (e.g., 'ampere', 'rdna2') */
  readonly architecture: string;
  /** Human-readable GPU description (e.g., 'NVIDIA GeForce RTX 3090') */
  readonly description: string;
}

/**
 * Structured result of the WebGPU capability detection performed by WebGPUDetector.detect().
 * Consumed by ModelLifecycleManager, useModelStatus hook, and DegradationBanner to make
 * branching decisions about LLM layer availability.
 */
export interface WebGPUCapability {
  /** Whether WebGPU is supported and a usable GPU adapter was found */
  readonly supported: boolean;
  /** GPU adapter hardware metadata — populated only when supported=true */
  readonly adapterInfo?: WebGPUAdapterInfo;
  /** Human-readable explanation of why WebGPU is not supported — populated when supported=false */
  readonly reason?: string;
  /** Wall-clock time in milliseconds spent on detection (for observability) */
  readonly detectionTimeMs: number;
  /**
   * Whether the browser is under significant memory pressure (Chrome-only).
   * When true, the LLM layer should be skipped even if WebGPU is supported.
   * Undefined on non-Chrome browsers where performance.memory is unavailable.
   */
  readonly memoryPressure?: boolean;
}
