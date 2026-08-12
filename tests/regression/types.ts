export interface BaselineSample {
  readonly sampleId: string;
  readonly category: string;
  readonly expectedDetected: boolean;
  readonly findingCount: number;
  readonly lastVerifiedCommit: string;
}

export interface RegressionBaseline {
  readonly version: number;
  readonly generatedAt: string;
  readonly samples: readonly BaselineSample[];
}

export interface SampleDetectionResult {
  readonly sampleId: string;
  readonly detected: boolean;
  readonly findingCount: number;
  readonly category?: string;
}

export interface RegressionEntry {
  readonly sampleId: string;
  readonly category: string;
  readonly expectedFindingCount: number;
  readonly actualFindingCount: number;
  readonly description: string;
}

export interface RegressionReport {
  readonly regressions: readonly RegressionEntry[];
  readonly totalChecked: number;
  readonly totalRegressed: number;
  readonly absoluteFnr: number;
  readonly warnings: readonly string[];
}
