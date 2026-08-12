import { useState, useEffect } from 'react';
import { WebGPUDetector } from '@/infra/webgpu-detector';
import type { WebGPUCapability } from '@/types/webgpu';

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
  /**
   * The raw WebGPUCapability result from the async detector.
   * Undefined while detection is in progress (modelState === 'checking').
   */
  webgpuCapability?: WebGPUCapability;
  /**
   * Human-readable reason why WebGPU/LLM is unavailable.
   * Populated when llm === 'unavailable'.
   */
  webgpuUnavailableReason?: string;
}

/**
 * Hook providing detection layer engine readiness, WebGPU hardware availability,
 * and LLM model lifecycle state.
 *
 * On mount, asynchronously probes WebGPU availability via WebGPUDetector.detect().
 * During detection the hook reports modelState === 'checking'. Once detection
 * resolves it updates all status fields based on the real capability result.
 *
 * Memory pressure (Chrome-only) is also factored in: if usedJSHeapSize exceeds 3 GB
 * the LLM layer is treated as unavailable even when WebGPU itself is supported.
 */
export function useModelStatus(): ModelStatusMap {
  const [webgpuCapability, setWebgpuCapability] = useState<WebGPUCapability | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    WebGPUDetector.detect().then((cap) => {
      if (!cancelled) {
        setWebgpuCapability(cap);
        setIsChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // While detection is running, report 'checking' state so UI can show a loading indicator
  if (isChecking) {
    return {
      regex: 'ready',
      entropy: 'ready',
      llm: 'loading',
      webgpuAvailable: false,
      modelState: 'checking',
      downloadProgress: 0,
    };
  }

  // WebGPU is considered available only when both:
  //   1. The GPU API is present and a valid adapter was found (supported === true)
  //   2. Memory pressure is not critical (memoryPressure !== true)
  const isWebGPUAvailable =
    webgpuCapability?.supported === true && webgpuCapability?.memoryPressure !== true;

  let webgpuUnavailableReason: string | undefined;
  if (webgpuCapability?.memoryPressure === true) {
    webgpuUnavailableReason = 'Memory pressure too high for LLM inference';
  } else if (webgpuCapability?.supported === false) {
    webgpuUnavailableReason = webgpuCapability.reason;
  }

  return {
    regex: 'ready',
    entropy: 'ready',
    llm: isWebGPUAvailable ? 'ready' : 'unavailable',
    webgpuAvailable: isWebGPUAvailable,
    modelState: isWebGPUAvailable ? 'ready' : 'unavailable',
    downloadProgress: 100,
    webgpuCapability: webgpuCapability ?? undefined,
    degradedMessage: isWebGPUAvailable
      ? undefined
      : 'Running in standard mode — regex and entropy scanning fully active',
    webgpuUnavailableReason,
  };
}
