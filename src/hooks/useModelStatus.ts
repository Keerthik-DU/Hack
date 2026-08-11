export type EngineStatus = 'ready' | 'loading' | 'unavailable';

export type ModelLifecycleState =
  'checking' | 'downloading' | 'verifying' | 'ready' | 'unavailable' | 'error';

export interface ModelStatusMap {
  regex: EngineStatus;
  entropy: EngineStatus;
  llm: EngineStatus;
  webgpuAvailable: boolean;
  modelState: ModelLifecycleState;
  downloadProgress: number;
  degradedMessage?: string;
}

/**
 * Hook providing detection layer engine readiness, WebGPU hardware availability,
 * and LLM model lifecycle state.
 */
export function useModelStatus(): ModelStatusMap {
  const isWebGPUAvailable =
    typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu !== undefined;

  return {
    regex: 'ready',
    entropy: 'ready',
    llm: isWebGPUAvailable ? 'ready' : 'unavailable',
    webgpuAvailable: isWebGPUAvailable,
    modelState: isWebGPUAvailable ? 'ready' : 'unavailable',
    downloadProgress: 100,
    degradedMessage: isWebGPUAvailable
      ? undefined
      : 'Running in standard mode — regex and entropy scanning fully active',
  };
}
