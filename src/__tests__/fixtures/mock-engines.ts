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
  public terminated = false;

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

    if (input.signal?.aborted) {
      this.terminated = true;
      return [];
    }

    if (this.delayMs > 0) {
      const aborted = await this.waitForDelay(this.delayMs, input.signal);
      if (aborted) {
        return [];
      }
    }

    if (input.signal?.aborted) {
      this.terminated = true;
      return [];
    }

    if (this.shouldFail) {
      throw new Error(this.errorMessage);
    }

    return [...this.findingsToReturn];
  }

  private async waitForDelay(delayMs: number, signal?: AbortSignal): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      if (signal?.aborted) {
        this.terminated = true;
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, delayMs);

      const onAbort = () => {
        this.terminated = true;
        cleanup();
        resolve(true);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      };

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

export class SlowMockEngine extends MockDetectionEngine {
  constructor(options: MockEngineOptions) {
    super(options);
  }
}
