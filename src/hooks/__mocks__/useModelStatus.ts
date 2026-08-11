import { ModelStatusMap, EngineStatus } from '../useModelStatus';

export const mockDefaultModelStatus: ModelStatusMap = {
  regex: 'ready',
  entropy: 'ready',
  llm: 'unavailable',
};

export function createMockModelStatus(overrides?: Partial<ModelStatusMap>): ModelStatusMap {
  return {
    ...mockDefaultModelStatus,
    ...overrides,
  };
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
