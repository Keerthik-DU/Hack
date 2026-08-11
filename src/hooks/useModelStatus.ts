export type EngineStatus = 'ready' | 'loading' | 'unavailable';

export interface ModelStatusMap {
  regex: EngineStatus;
  entropy: EngineStatus;
  llm: EngineStatus;
}

/**
 * Hook providing detection layer engine readiness status map.
 * (Stub implementation returning initial mock status)
 */
export function useModelStatus(): ModelStatusMap {
  return {
    regex: 'ready',
    entropy: 'ready',
    llm: 'loading',
  };
}
