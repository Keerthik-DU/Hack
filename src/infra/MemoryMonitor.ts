import {
  DEFAULT_MEMORY_CONFIG,
  type MemoryConfig,
  type MemoryStatus,
} from './memory-types';

type PerfWithMemory = Performance & {
  memory?: { usedJSHeapSize?: number; jsHeapSizeLimit?: number };
  measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
};

/**
 * Tracks browser memory pressure with API fallbacks (WO-054).
 * Never throws — always returns a valid MemoryStatus.
 */
export class MemoryMonitor {
  private readonly config: MemoryConfig;
  private readonly readings: number[] = [];
  private status: MemoryStatus;
  private timer: ReturnType<typeof setInterval> | null = null;
  private modelLoaded = false;
  private inputBytes = 0;
  private apiSource: MemoryStatus['apiSource'] = 'unknown';

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.status = this.buildStatus(0, 'unknown');
  }

  setModelLoaded(loaded: boolean): void {
    this.modelLoaded = loaded;
  }

  setInputBytes(bytes: number): void {
    this.inputBytes = Math.max(0, bytes);
  }

  start(): void {
    if (this.timer) return;
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, this.config.pollingIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.readings.length = 0;
  }

  getCurrentStatus(): MemoryStatus {
    return this.status;
  }

  isApproachingLimit(): boolean {
    return this.status.isApproachingLimit;
  }

  isAtCeiling(): boolean {
    return this.status.isAtCeiling;
  }

  getHeadroomMB(): number {
    return this.status.headroomMB;
  }

  getApiSource(): MemoryStatus['apiSource'] {
    return this.apiSource;
  }

  /** Force a synchronous heuristic/legacy reading (tests / before LLM). */
  async refresh(): Promise<MemoryStatus> {
    const usageMB = await this.sampleUsageMB();
    this.readings.push(usageMB);
    if (this.readings.length > 3) this.readings.shift();
    const avg =
      this.readings.reduce((a, b) => a + b, 0) / Math.max(1, this.readings.length);
    this.status = this.buildStatus(avg, this.apiSource);
    return this.status;
  }

  private buildStatus(usageMB: number, apiSource: MemoryStatus['apiSource']): MemoryStatus {
    const ceiling = this.config.ceilingThresholdMB;
    return {
      usageMB,
      headroomMB: Math.max(0, ceiling - usageMB),
      apiSource,
      isApproachingLimit: usageMB > this.config.warningThresholdMB,
      isAtCeiling: usageMB > this.config.ceilingThresholdMB,
    };
  }

  private async sampleUsageMB(): Promise<number> {
    const perf = globalThis.performance as PerfWithMemory | undefined;
    try {
      if (perf?.measureUserAgentSpecificMemory) {
        const result = await perf.measureUserAgentSpecificMemory();
        this.apiSource = 'measureUserAgentSpecificMemory';
        return result.bytes / (1024 * 1024);
      }
    } catch {
      // fall through
    }

    try {
      if (perf?.memory?.usedJSHeapSize != null) {
        this.apiSource = 'performance.memory';
        return perf.memory.usedJSHeapSize / (1024 * 1024);
      }
    } catch {
      // fall through
    }

    this.apiSource = 'heuristic';
    const model = this.modelLoaded ? (this.config.modelLoadedEstimateMB ?? 1536) : 0;
    const baseline = this.config.baselineEstimateMB ?? 200;
    const inputMB = this.inputBytes / (1024 * 1024);
    return baseline + model + inputMB;
  }
}
