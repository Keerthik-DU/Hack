import type { EngineInput, Finding, IDetectionEngine } from '../../../src/types';

export class MockLLMAnalyzer implements IDetectionEngine {
  readonly name = 'MockLLMAnalyzer';
  readonly layer = 2 as const;
  analyzeCalled = 0;
  constructor(
    public findingsToReturn: Finding[] = [],
    public delayMs = 0,
    public available = true,
    public shouldThrow: Error | null = null
  ) {}
  isAvailable() { return this.available; }
  async analyze(input: EngineInput): Promise<Finding[]> {
    this.analyzeCalled++;
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.shouldThrow) throw this.shouldThrow;
    if (input.signal?.aborted) return [];
    return this.findingsToReturn;
  }
}
