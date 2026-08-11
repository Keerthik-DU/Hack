import { IDetectionEngine, Finding } from '@/types';

/**
 * Factory function creating a mock IDetectionEngine for testing.
 */
export function createTestEngine(
  overrides?: Partial<IDetectionEngine>
): IDetectionEngine {
  return {
    name: overrides?.name ?? 'MockDetectionEngine',
    layer: overrides?.layer ?? 1,
    analyze: overrides?.analyze ?? (async (): Promise<Finding[]> => []),
    isAvailable: overrides?.isAvailable ?? (() => true),
  };
}
