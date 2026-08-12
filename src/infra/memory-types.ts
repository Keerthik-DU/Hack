export interface MemoryConfig {
  readonly warningThresholdMB: number;
  readonly ceilingThresholdMB: number;
  readonly pollingIntervalMs: number;
  readonly modelLoadedEstimateMB?: number;
  readonly baselineEstimateMB?: number;
}

export interface MemoryStatus {
  readonly usageMB: number;
  readonly headroomMB: number;
  readonly apiSource: 'measureUserAgentSpecificMemory' | 'performance.memory' | 'heuristic' | 'unknown';
  readonly isApproachingLimit: boolean;
  readonly isAtCeiling: boolean;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  warningThresholdMB: 3072,
  ceilingThresholdMB: 3584,
  pollingIntervalMs: 5000,
  modelLoadedEstimateMB: 1536,
  baselineEstimateMB: 200,
};
