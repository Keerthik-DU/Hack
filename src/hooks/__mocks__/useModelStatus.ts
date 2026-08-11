import { ModelStatusMap, EngineStatus, ModelLifecycleState } from '../useModelStatus';

export const mockDefaultModelStatus: ModelStatusMap = {
  regex: 'ready',
  entropy: 'ready',
  llm: 'ready',
  webgpuAvailable: true,
  modelState: 'ready',
  downloadProgress: 100,
};

export function createMockModelStatus(overrides?: Partial<ModelStatusMap>): ModelStatusMap {
  return {
    ...mockDefaultModelStatus,
    ...overrides,
  };
}

export function createMockModelLifecycleStatus(
  modelState: ModelLifecycleState,
  downloadProgress = 0
): ModelStatusMap {
  return createMockModelStatus({
    modelState,
    downloadProgress,
    llm:
      modelState === 'ready' ? 'ready' : modelState === 'downloading' ? 'loading' : 'unavailable',
  });
}

export function createMockWebGPUUnavailableStatus(): ModelStatusMap {
  return createMockModelStatus({
    webgpuAvailable: false,
    modelState: 'unavailable',
    llm: 'unavailable',
    degradedMessage: 'Running in standard mode — regex and entropy scanning fully active',
  });
}

export function getStatusDotColor(status: EngineStatus): string {
  switch (status) {
    case 'ready':
      return 'bg-emerald-500';
    case 'loading':
      return 'bg-amber-500 animate-pulse';
    case 'unavailable':
      return 'bg-gray-400 dark:bg-gray-600';
  }
}
