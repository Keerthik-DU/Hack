import { IDetectionEngine, EngineInput, Finding } from '@/types';

export interface MockEngineOptions {
  name: string;
  layer: 1 | 2 | 3;
  isAvailable?: boolean;
  delayMs?: number;
  findingsToReturn?: Finding[];
  shouldFail?: boolean;
  errorMessage?: string;
}

export class MockDetectionEngine implements IDetectionEngine {
  public readonly name: string;
  public readonly layer: 1 | 2 | 3;
  public readonly available: boolean;
  public readonly delayMs: number;
  public readonly findingsToReturn: Finding[];
  public readonly shouldFail: boolean;
  public readonly errorMessage: string;
  public analyzeCallCount = 0;

  constructor(options: MockEngineOptions) {
    this.name = options.name;
    this.layer = options.layer;
    this.available = options.isAvailable ?? true;
    this.delayMs = options.delayMs ?? 0;
    this.findingsToReturn = options.findingsToReturn ?? [];
    this.shouldFail = options.shouldFail ?? false;
    this.errorMessage = options.errorMessage ?? `${options.name} failed execution`;
  }

  public isAvailable(): boolean {
    return this.available;
  }

  public async analyze(input: EngineInput): Promise<Finding[]> {
    this.analyzeCallCount++;
    void input;

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      throw new Error(this.errorMessage);
    }

    return [...this.findingsToReturn];
  }
}
